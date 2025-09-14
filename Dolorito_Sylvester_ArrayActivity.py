arr = [10, 20, 30, 40, 50]

key = 10

for i in range(len(arr)):

    if arr[i] == key:
        found = True
        break

if found:
      print("Element found at index:", i)
else:       print("Element not found")