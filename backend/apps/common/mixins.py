"""
Reusable view building blocks shared across domain apps.

- PartnerManagedResourceViewSet: base for simple "master data" resources
  (Client, Product, ...) that all share the same access rule — any
  authenticated user can read, only a Partner can write. Subclasses
  just set `queryset` and `serializer_class`.
- CsvImportMixin: adds a POST /<resource>/import/ action for bulk
  creation from a single-column CSV. Client and Product both mix this
  in as-is; a future resource with a differently-named unique field
  can override `import_field`.
- StatusTransitionMixin: order status state machine, added in Phase 4.
"""
import csv
import io

from django.db import IntegrityError, transaction
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .permissions import HasRole


class PartnerManagedResourceViewSet(viewsets.ModelViewSet):
    """Read: any authenticated user. Write (create/update/delete): Partner only."""

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [permissions.IsAuthenticated()]
        return [HasRole.for_roles("PARTNER")()]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class CsvImportMixin:
    """
    One-step import: every valid, non-duplicate row is committed
    immediately. Bad rows (blank value, duplicate against an existing
    record, duplicate within the file itself) are skipped and reported
    back — they don't block the rows that are fine.
    """

    import_field = "name"  # model field the value is written to
    csv_header = None  # expected CSV column header (case-insensitive); defaults to import_field

    @action(detail=False, methods=["post"], url_path="import")
    def import_csv(self, request):
        file = request.FILES.get("file")
        if not file:
            return Response({"detail": "No file uploaded."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            decoded = file.read().decode("utf-8-sig")
        except UnicodeDecodeError:
            return Response(
                {"detail": "Could not read the file — please upload a UTF-8 CSV."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        header = (self.csv_header or self.import_field).strip().lower()

        reader = csv.DictReader(io.StringIO(decoded))
        reader.fieldnames = [(h or "").strip().lower() for h in (reader.fieldnames or [])]

        if header not in reader.fieldnames:
            return Response(
                {"detail": f"CSV must have a '{header}' column."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        model = self.get_queryset().model
        created = []
        skipped = []
        seen_in_file = set()

        for i, row in enumerate(reader, start=2):  # row 1 is the header
            value = (row.get(header) or "").strip()
            if not value:
                skipped.append({"row": i, "reason": "Missing value."})
                continue
            key = value.lower()
            if key in seen_in_file:
                skipped.append({"row": i, "value": value, "reason": "Duplicate within file."})
                continue
            if model.objects.filter(**{f"{self.import_field}__iexact": value}).exists():
                skipped.append({"row": i, "value": value, "reason": "Already exists."})
                continue
            seen_in_file.add(key)
            try:
                with transaction.atomic():
                    model.objects.create(**{self.import_field: value}, created_by=request.user)
                created.append(value)
            except IntegrityError:
                skipped.append({"row": i, "value": value, "reason": "Database rejected this row."})

        return Response({"created_count": len(created), "created": created, "skipped": skipped})


# TODO(Phase 4): StatusTransitionMixin — order status state machine.
