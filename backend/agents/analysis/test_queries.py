from db import get_supplier_by_id, find_alternative_suppliers

print("Supplier with ID = 1")
print(get_supplier_by_id(1))

print("\nAlternative suppliers for Supplier 1")
print(find_alternative_suppliers(1))