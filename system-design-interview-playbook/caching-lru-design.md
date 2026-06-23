# Design a cache that never slows down no matter how many items you store. What data structure?

**SIMPLE EXPLANATION — Read This First**

Short Answer: A Hash Map combined with a Doubly Linked List. The HashMap gives O(1) lookup of any item. The Doubly Linked List lets you instantly find and remove the "least recently used" item for eviction. Both operations are O(1) regardless of how many items are stored.

- Why O(1) matters: "Never slows down" means: whether the cache has 10 items or 10 million, every get and put takes the same amount of time.
- What is a HashMap: A dictionary: key → value lookup in constant time. No matter how big it gets, finding any item takes the same time (hash the key, go to that bucket).
- Problem with HashMap alone: When cache is full, you need to evict (remove) the least recently used item. But how do you know which item was used least recently? You'd have to scan all items — O(N). Too slow.
- What is a Doubly Linked List: A chain of nodes where each node knows its previous AND next neighbour. Adding to the front (most recent) and removing from the end (least recent) both take O(1) — you just update a few pointers.
- The combination: HashMap stores: key → pointer directly to the node in the list. You find it in O(1), and because you have the pointer, you can reorder or remove the node in O(1) too. No scanning needed.
- GET(key): (1) Look up node via HashMap — O(1). (2) Move that node to the front of the list (most recently used) — O(1). Return value.
- PUT(key, value) when full: (1) Remove the node at the TAIL of the list (least recently used) — O(1). (2) Remove from HashMap — O(1). (3) Add new node to HEAD — O(1). (4) Add to HashMap — O(1).

**DEEP DIVE — Technical Architecture Below**

## Visual: How It Works

```
  HashMap: { A→Node_A, D→Node_D, B→Node_B }
```

```
  Doubly Linked List:
  HEAD ↔ [D, val=4] ↔ [A, val=1] ↔ [B, val=2] ↔ TAIL
          (most recent)                (least recent)
```

```
  GET(A):
    1. hashmap["A"] → Node_A pointer        O(1)
    2. Unlink Node_A (update 2 pointers)    O(1)
    3. Re-insert at HEAD                    O(1)
  Result: HEAD ↔ [A] ↔ [D] ↔ [B] ↔ TAIL
```

```
  PUT(C) — cache full, capacity=3:
    1. Evict tail.prev = Node_B             O(1)
    2. del hashmap["B"]                     O(1)
    3. Insert Node_C at HEAD                O(1)
    4. hashmap["C"] = Node_C                O(1)
  Result: HEAD ↔ [C] ↔ [A] ↔ [D] ↔ TAIL
```

## Why Doubly Linked (Not Singly Linked)?

Removing a node from the middle requires updating both the previous node's "next" pointer and the next node's "prev" pointer. With a singly linked list, you don't know the previous node without scanning from the head. Doubly linked = O(1) removal from any position given a direct pointer.

## Complete Implementation

```
class Node:
    def __init__(self, k, v):
        self.key, self.val, self.prev, self.next = k, v, None, None
```

```
class LRUCache:
    def __init__(self, capacity):
        self.cap = capacity
        self.map = {}  # key → Node
        # Sentinel nodes: head=most-recent end, tail=least-recent end
        self.head = Node(0, 0)
        self.tail = Node(0, 0)
        self.head.next = self.tail
        self.tail.prev = self.head
```

```
    def _remove(self, node):            # O(1)
        node.prev.next = node.next
        node.next.prev = node.prev
```

```
    def _insert_front(self, node):      # O(1)
        node.next = self.head.next
        node.prev = self.head
        self.head.next.prev = node
        self.head.next = node
```

```
    def get(self, key):
        if key not in self.map: return -1
        node = self.map[key]
        self._remove(node)
        self._insert_front(node)
        return node.val
```

```
    def put(self, key, value):
        if key in self.map:
            self._remove(self.map[key])
        elif len(self.map) == self.cap:
            lru = self.tail.prev          # least recently used
            self._remove(lru)
            del self.map[lru.key]
        new = Node(key, value)
        self._insert_front(new)
        self.map[key] = new
```

## Why Not Other Data Structures?

| Structure | GET | Evict LRU | Problem |
| --- | --- | --- | --- |
| Array | O(1) by index | O(N) | Must scan entire array to find oldest item |
| HashMap only | O(1) | O(N) | No way to know which item is least recently used |
| Min-Heap | O(log N) | O(log N) | Grows slower as cache grows — violates constraint |
| HashMap + DLL | O(1) | O(1) | Correct — both operations always constant time ✓ |

## Theoretical Framework — Interview Talking Points

- Read/Write Trade-off: HashMap+DLL is read-optimized: O(1) GET at the cost of maintaining a DLL on every write (4-pointer update). This constant-time write overhead enables O(1) reads. Pay a small, fixed write cost to make reads maximally fast.
- Write Amplification (LFU vs LRU): LRU amplifies every GET with 2 DLL writes (remove + reinsert). LFU adds even more: frequency map update + bucket move. W-TinyLFU (Caffeine/Java, Ristretto/Go) uses a Count-Min Sketch to approximate frequency in fixed space, dramatically reducing write amplification while maintaining near-optimal hit rates.
- PACELC: Distributed cache under normal operation: prefers Latency over Consistency. A cache read from a replica may return a value slightly behind the primary. The sub-millisecond response is more valuable than microsecond-level staleness. This is the ELC trade-off that makes caches worth having at all.
