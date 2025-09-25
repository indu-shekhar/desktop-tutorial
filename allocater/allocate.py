import csv
from collections import defaultdict

# Define slot capacities (modify as needed)
SLOT_CAPACITIES = {
    'SLOT 1 (5:30AM TO 7:00 AM)': 23,
    'SLOT 2 (7:00AM TO 8:30AM)': 11,
    'SLOT 3 (4:00PM TO 5:30PM)': 19,
    'SLOT 4 (5:30PM TO 7:00PM)': 5,
    'SLOT 5 (7:00PM TO 8:30PM)': 11
}

input_file = 'response.csv'
output_file = 'Gym access form (Responses) - Allocated_august.csv'

# Track allocations per slot
slot_allocation = defaultdict(list)

# Read registrations
with open(input_file, newline='', encoding='utf-8') as csvfile:
    reader = list(csv.DictReader(csvfile))

# Sort by registration timestamp
reader.sort(key=lambda x: x['Timestamp'])

for row in reader:
    allocated = False
    preferences = [row.get('SLOT PRÉFÉRENCE : 1', '').strip()]
    # Add optional preferences if present and non-empty
    for pref_col in ['SLOT PRÉFÉRENCE : 2', 'SLOT PRÉFÉRENCE : 3']:
        pref = row.get(pref_col, '').strip()
        if pref:
            preferences.append(pref)
    for slot in preferences:
        if slot in SLOT_CAPACITIES and len(slot_allocation[slot]) < SLOT_CAPACITIES[slot]:
            slot_allocation[slot].append(row['ROLL NUMBER'])
            row['Allocated Slot'] = slot
            allocated = True
            break
    if not allocated:
        row['Allocated Slot'] = 'Unassigned'

# Write output CSV
with open(output_file, 'w', newline='', encoding='utf-8') as csvfile:
    fieldnames = list(reader[0].keys())
    writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
    writer.writeheader()
    for row in reader:
        writer.writerow(row)
