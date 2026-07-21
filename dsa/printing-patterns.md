# Printing Patterns

**Concept:** Use nested loops to print characters in a specific shape. Outer loop controls rows, inner loop controls columns/spaces/characters.

**When to use:**
- Interview warm-up / logic building
- Understanding nested loop control flow
- Foundation for matrix traversal problems

**Complexities:** Time O(n²) | Space O(1)

---

## Pseudo Code

### General Template

```
for row = 1 to n:
    for col = 1 to row:        ← inner loop depends on row
        print character
    print newline
```

**Key insight:** Figure out what to print at position (row, col) — spaces, stars, or numbers. The relationship between row and col determines the shape.

---

## Table of Contents

| # | Pattern | Difficulty |
|---|---------|------------|
| 1 | [Right Triangle](#1-right-triangle) | Easy |
| 2 | [Inverted Right Triangle](#2-inverted-right-triangle) | Easy |
| 3 | [Number Triangle](#3-number-triangle) | Easy |
| 4 | [Same Number Triangle](#4-same-number-triangle) | Easy |
| 5 | [Floyd's Triangle](#5-floyds-triangle) | Easy |
| 6 | [Pyramid (Centered)](#6-pyramid-centered) | Medium |
| 7 | [Diamond](#7-diamond) | Medium |
| 8 | [Hollow Rectangle](#8-hollow-rectangle) | Medium |
| 9 | [Butterfly Pattern](#9-butterfly-pattern) | Medium |
| 10 | [Pascal's Triangle](#10-pascals-triangle) | Medium |

---

## 1. Right Triangle

**Difficulty:** Easy
**Date:** 2026-07-21

### Pattern

```
*
* *
* * *
* * * *
* * * * *
```

### Problem Statement

Given `n`, print a right-angled triangle of stars with `n` rows. Row `i` has exactly `i` stars.

### Approach

Outer loop runs from 1 to n (rows). Inner loop runs from 0 to i (columns) — prints i stars on row i. After inner loop, print newline to move to next row.

### Solution

```csharp
public static void PrintRightTriangle(int num)
{
    for (int i = 1; i <= num; i++)
    {
        for (int j = 0; j < i; j++)
        {
            Console.Write("*");
        }
        Console.WriteLine();
    }
}
```

### Complexity

- **Time:** O(n²) — outer loop n times, inner loop up to n times
- **Space:** O(1)

---

## 2. Inverted Right Triangle

**Difficulty:** Easy

### Pattern

```
* * * * *
* * * *
* * *
* *
*
```

### Problem Statement

Given `n`, print an inverted right-angled triangle. Row `i` has `(n - i + 1)` stars.

### Approach

_To be added_

### Solution

_To be added_

### Complexity

- **Time:** -
- **Space:** -

---

## 3. Number Triangle

**Difficulty:** Easy

### Pattern

```
1
1 2
1 2 3
1 2 3 4
1 2 3 4 5
```

### Problem Statement

Given `n`, print a triangle where row `i` prints numbers `1` to `i`.

### Approach

_To be added_

### Solution

_To be added_

### Complexity

- **Time:** -
- **Space:** -

---

## 4. Same Number Triangle

**Difficulty:** Easy

### Pattern

```
1
2 2
3 3 3
4 4 4 4
5 5 5 5 5
```

### Problem Statement

Given `n`, print a triangle where row `i` prints the number `i` exactly `i` times.

### Approach

_To be added_

### Solution

_To be added_

### Complexity

- **Time:** -
- **Space:** -

---

## 5. Floyd's Triangle

**Difficulty:** Easy

### Pattern

```
1
2 3
4 5 6
7 8 9 10
```

### Problem Statement

Given `n`, print Floyd's triangle — consecutive numbers starting from 1, filling row by row. Row `i` has `i` numbers.

### Approach

_To be added_

### Solution

_To be added_

### Complexity

- **Time:** -
- **Space:** -

---

## 6. Pyramid (Centered)

**Difficulty:** Medium

### Pattern

```
    *
   * *
  * * *
 * * * *
* * * * *
```

### Problem Statement

Given `n`, print a centered pyramid. Row `i` has `(n - i)` leading spaces followed by `i` stars.

### Approach

_To be added_

### Solution

_To be added_

### Complexity

- **Time:** -
- **Space:** -

---

## 7. Diamond

**Difficulty:** Medium

### Pattern

```
    *
   * *
  * * *
 * * * *
* * * * *
 * * * *
  * * *
   * *
    *
```

### Problem Statement

Given `n`, print a diamond shape — a centered pyramid followed by its mirror (inverted pyramid).

### Approach

_To be added_

### Solution

_To be added_

### Complexity

- **Time:** -
- **Space:** -

---

## 8. Hollow Rectangle

**Difficulty:** Medium

### Pattern

```
* * * * *
*       *
*       *
* * * * *
```

### Problem Statement

Given `rows` and `cols`, print a rectangle of stars where only the border cells have stars and interior cells are spaces.

### Approach

_To be added_

### Solution

_To be added_

### Complexity

- **Time:** -
- **Space:** -

---

## 9. Butterfly Pattern

**Difficulty:** Medium

### Pattern

```
*       *
* *   * *
* * * * *
* *   * *
*       *
```

### Problem Statement

Given `n`, print a butterfly pattern. Row `i` has `i` stars, then `2*(n-i)` spaces, then `i` stars again. Then mirror the top half.

### Approach

_To be added_

### Solution

_To be added_

### Complexity

- **Time:** -
- **Space:** -

---

## 10. Pascal's Triangle

**Difficulty:** Medium

### Pattern

```
1
1 1
1 2 1
1 3 3 1
1 4 6 4 1
```

### Problem Statement

Given `n`, print Pascal's Triangle with `n` rows. Each number equals the sum of the two numbers directly above it. The first and last element of every row is always `1`.

### Approach

_To be added_

### Solution

_To be added_

### Complexity

- **Time:** -
- **Space:** -

---
