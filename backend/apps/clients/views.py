from rest_framework import filters

from apps.common.mixins import CsvImportMixin, PartnerManagedResourceViewSet

from .models import Client
from .serializers import ClientSerializer


class ClientViewSet(CsvImportMixin, PartnerManagedResourceViewSet):
    """
    /api/clients/         GET (any authenticated user), POST (Partner)
    /api/clients/{id}/    GET, PATCH, DELETE (Partner for writes)
    /api/clients/import/  POST a CSV with one 'name' column (Partner)
    """

    queryset = Client.objects.all()
    serializer_class = ClientSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ["name"]
    pagination_class = None  # small dataset, feeds a searchable dropdown elsewhere
