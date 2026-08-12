from rest_framework import filters

from apps.common.mixins import CsvImportMixin, PartnerManagedResourceViewSet

from .models import Product
from .serializers import ProductSerializer


class ProductViewSet(CsvImportMixin, PartnerManagedResourceViewSet):
    """
    /api/products/         GET (any authenticated user), POST (Partner)
    /api/products/{id}/    GET, PATCH, DELETE (Partner for writes)
    /api/products/import/  POST a CSV with one 'name' column (Partner)
    """

    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ["name"]
    pagination_class = None  # small dataset, feeds a searchable dropdown elsewhere
    csv_header = "product name"  # matches the header used in products.csv
