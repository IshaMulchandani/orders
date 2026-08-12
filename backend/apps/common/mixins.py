"""
Reusable view mixins shared across domain apps.

- CsvImportMixin: generic "upload CSV -> validate -> preview -> commit"
  flow. apps.clients and apps.products both extend this with just a
  serializer and a unique-key column (Phase 2).
- StatusTransitionMixin: generic "validate current status -> apply new
  status -> write OrderEvent -> notify" flow used by the order
  transition endpoint (Phase 4).

Left as documented stubs in Phase 0 since they depend on models that
don't exist yet.
"""

# TODO(Phase 2): implement CsvImportMixin.
# TODO(Phase 4): implement StatusTransitionMixin.
