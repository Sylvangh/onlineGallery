class Node:
    def __init__(self, data):
        self.data = data #stores the actual value of the node
        self.next = None #stores the reference (link) to the next node

#Function to traverse and print the list

def traverse (head):
    current = head
    while current:
        print (current.data, end=" -> ")
        current = current.next
    print("None")

#Create nodes

node1 = Node(10)

node2 = Node(20)

node3 = Node(30)

#Link them together

node1.next = node2 #10 -> 20

node2.next = node3 #20->30

#Current head

head = node1

#Traverse before insertion

print("Traversal:")
traverse(head)
