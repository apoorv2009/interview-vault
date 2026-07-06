# DSA Pattern Identification Cheat Sheet

When you read a problem, scan this list for matching keywords and clues to identify the pattern before coding.

---

## 1. Two Pointers

**Difficulty:** Easy–Med

**Spot it when you see:**
- Array is sorted
- Find pair/triplet with sum
- Check palindrome
- Remove duplicates in-place

**Keywords:** sorted array, pair sum, palindrome, reverse, remove duplicates, two numbers, in-place, triplet, opposite ends

**Examples:** Two Sum II, Valid Palindrome, 3Sum, Container With Most Water

---

## 2. Sliding Window

**Difficulty:** Easy–Hard

**Spot it when you see:**
- Contiguous subarray/substring
- Max/min over a range
- Fixed size K window
- Longest with condition

**Keywords:** subarray, substring, contiguous, window, max sum, longest, minimum window, at most K, consecutive

**Examples:** Max Sum Subarray K, Longest Substring No Repeat, Minimum Window Substring

---

## 3. Binary Search

**Difficulty:** Easy–Hard

**Spot it when you see:**
- Data is sorted
- Find index of element
- O(log n) required
- Search in rotated array

**Keywords:** sorted, O(log n), find position, search, rotated, peak, minimum in rotated, boundary

**Examples:** Binary Search, Search Rotated Array, Peak Element

---

## 4. Hashing / Frequency Counting

**Difficulty:** Easy–Med

**Spot it when you see:**
- Check if exists in O(1)
- Count occurrences
- Group by property
- Find complement

**Keywords:** count, frequency, duplicate, anagram, two sum, group, seen before, exists, O(1) lookup

**Examples:** Two Sum, Contains Duplicate, Group Anagrams, Top K Frequent

---

## 5. Fast & Slow Pointers

**Difficulty:** Easy–Med

**Spot it when you see:**
- Detect cycle in linked list
- Find middle node
- Check if cyclic

**Keywords:** linked list, cycle, middle, loop, Floyd, detect cycle, find start of cycle, happy number

**Examples:** Linked List Cycle, Middle of Linked List, Happy Number

---

## 6. Merge Intervals

**Difficulty:** Med

**Spot it when you see:**
- Given list of intervals
- Find overlaps
- Merge or insert intervals
- Meeting rooms

**Keywords:** intervals, overlap, merge, schedule, meeting, insert interval, calendar, range

**Examples:** Merge Intervals, Insert Interval, Meeting Rooms

---

## 7. Cyclic Sort

**Difficulty:** Easy–Med

**Spot it when you see:**
- Array contains numbers in range 1 to n
- Find missing or duplicate
- Place at correct index

**Keywords:** missing number, find duplicate, array 1 to n, numbers in range, first missing positive, all duplicates

**Examples:** Missing Number, Find All Duplicates, First Missing Positive

---

## 8. Tree DFS / BFS

**Difficulty:** Easy–Hard

**Spot it when you see:**
- Binary tree problem
- Find path or depth
- Level by level traversal
- Find ancestor

**Keywords:** binary tree, traversal, height, depth, path sum, level order, diameter, LCA, inorder, preorder, zigzag

**Examples:** Max Depth, Path Sum, Level Order Traversal, Diameter of Binary Tree

---

## 9. Graph DFS / BFS

**Difficulty:** Med–Hard

**Spot it when you see:**
- 2D grid or graph
- Number of connected regions
- Shortest path (unweighted)
- Explore all nodes

**Keywords:** graph, islands, connected components, matrix, grid, path, shortest path, clone, neighbors, visited

**Examples:** Number of Islands, Clone Graph, Pacific Atlantic Water Flow

---

## 10. Heap / Top K Elements

**Difficulty:** Med–Hard

**Spot it when you see:**
- Find Kth element
- Top K frequent
- Median of stream
- Merge K sorted lists

**Keywords:** top K, Kth largest, Kth smallest, median, stream, frequent, merge K, priority, closest

**Examples:** Kth Largest Element, Top K Frequent Elements, Merge K Sorted Lists

---

## 11. Backtracking

**Difficulty:** Med–Hard

**Spot it when you see:**
- Find ALL solutions
- Generate all combos/permutations
- Constraint satisfaction
- Explore then undo

**Keywords:** all combinations, all subsets, permutations, generate all, constraint, N-Queens, Sudoku, word search, explore all

**Examples:** Subsets, Permutations, N-Queens, Sudoku Solver

---

## 12. Dynamic Programming

**Difficulty:** Med–Hard

**Spot it when you see:**
- Maximize/minimize something
- Count number of ways
- Overlapping subproblems
- Optimal substructure

**Keywords:** maximum, minimum, count ways, how many, optimal, subsequence, knapsack, coin change, overlapping subproblems, memoize

**Examples:** Climbing Stairs, Coin Change, Longest Common Subsequence, 0/1 Knapsack

---

## 13. Monotonic Stack

**Difficulty:** Med–Hard

**Spot it when you see:**
- Next greater/smaller element
- Maintain order while scanning
- Histogram problems

**Keywords:** next greater, next smaller, previous greater, daily temperatures, largest rectangle, stock span, histogram

**Examples:** Daily Temperatures, Next Greater Element, Largest Rectangle in Histogram

---

## 14. Prefix Sum

**Difficulty:** Easy–Med

**Spot it when you see:**
- Sum of elements between index i and j
- Subarray sum equals target
- Multiple range queries

**Keywords:** range sum, subarray sum equals K, sum between indices, running sum, cumulative, 2D sum

**Examples:** Range Sum Query, Subarray Sum Equals K

---

## 15. Matrix Traversal

**Difficulty:** Med

**Spot it when you see:**
- 2D matrix operations
- Spiral or diagonal traversal
- Rotate/flip matrix

**Keywords:** matrix, 2D grid, spiral, rotate, set zeroes, diagonal, word search in grid, BFS on grid

**Examples:** Spiral Matrix, Rotate Image, Set Matrix Zeroes

---

## Quick Reference

| Pattern | Key Signal |
|---|---|
| Two Pointers | sorted + pair/triplet |
| Sliding Window | contiguous subarray/substring |
| Binary Search | sorted + O(log n) |
| Hashing | O(1) lookup + frequency |
| Fast & Slow Pointers | linked list + cycle |
| Merge Intervals | list of intervals |
| Cyclic Sort | array with numbers 1 to n |
| Tree DFS/BFS | binary tree |
| Graph DFS/BFS | grid or graph |
| Heap / Top K | Kth element or top K |
| Backtracking | find ALL solutions |
| Dynamic Programming | maximize/minimize + overlapping |
| Monotonic Stack | next greater/smaller |
| Prefix Sum | range sum queries |
| Matrix Traversal | 2D matrix operations |
