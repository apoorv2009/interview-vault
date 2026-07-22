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
| 11 | [Square](#11-square) | Easy |
| 12 | [Hollow Pyramid](#12-hollow-pyramid) | Medium |
| 13 | [Sandglass](#13-sandglass) | Medium |
| 14 | [Cross](#14-cross) | Medium |

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
public static void PrintPattern(int num)
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
**Date:** 2026-07-21

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

Outer loop runs 1 to n. Inner loop starts at n and goes down to i — so row 1 prints n stars, row 2 prints n-1 stars, decreasing each time.

### Solution

```csharp
public static void PrintPattern(int num)
{
    for (int i = 1; i <= num; i++)
    {
        for (int j = num; j >= i; j--)
        {
            Console.Write("*");
        }
        Console.WriteLine();
    }
}
```

### Complexity

- **Time:** O(n²)
- **Space:** O(1)

---

## 3. Number Triangle

**Difficulty:** Easy
**Date:** 2026-07-21

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

Same structure as Right Triangle. Inner loop runs 0 to i, but instead of printing `*` print `j+1` to get numbers 1, 2, 3...

### Solution

```csharp
public static void PrintPattern(int num)
{
    for (int i = 1; i <= num; i++)
    {
        for (int j = 1; j <= i; j++)
        {
            Console.Write(j + " ");
        }
        Console.WriteLine();
    }
}
```

### Complexity

- **Time:** O(n²)
- **Space:** O(1)

---

## 4. Same Number Triangle

**Difficulty:** Easy
**Date:** 2026-07-21

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

Same structure as Number Triangle but print `i` instead of `j` — the row number is constant throughout each row.

### Solution

```csharp
public static void PrintPattern(int num)
{
    for (int i = 1; i <= num; i++)
    {
        for (int j = 1; j <= i; j++)
        {
            Console.Write(i + " ");
        }
        Console.WriteLine();
    }
}
```

### Complexity

- **Time:** O(n²)
- **Space:** O(1)

---

## 5. Floyd's Triangle

**Difficulty:** Easy
**Date:** 2026-07-21

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

Declare a counter outside both loops. Inner loop prints the counter and increments it — counter never resets so it keeps going across all rows.

### Solution

```csharp
public static void PrintPattern(int num)
{
    int count = 1;
    for (int i = 1; i <= num; i++)
    {
        for (int j = 1; j <= i; j++)
        {
            Console.Write(count + " ");
            count++;
        }
        Console.WriteLine();
    }
}
```

### Complexity

- **Time:** O(n²)
- **Space:** O(1)

---

## 6. Pyramid (Centered)

**Difficulty:** Medium
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

Given `n`, print a centered pyramid. Row `i` has `(n - i)` leading spaces followed by `i` stars.

### Approach

Two inner loops per row — first loop prints `n - i` spaces (decreasing), second loop prints `i` stars (increasing).

### Solution

```csharp
public static void PrintPattern(int num)
{
    for (int i = 1; i <= num; i++)
    {
        for (int s = 0; s < num - i; s++)
        {
            Console.Write(" ");
        }
        for (int j = 0; j < i; j++)
        {
            Console.Write("* ");
        }
        Console.WriteLine();
    }
}
```

### Complexity

- **Time:** O(n²)
- **Space:** O(1)

---

## 7. Diamond

**Difficulty:** Medium
**Date:** 2026-07-21

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

Two separate loops. Top half: i goes 1 to n (pyramid). Bottom half: i goes n-1 down to 1 (inverted pyramid) — starting from n-1 avoids repeating the middle row.

### Solution

```csharp
public static void PrintPattern(int num)
{
    for (int i = 1; i <= num; i++)
    {
        for (int s = 0; s < num - i; s++)
            Console.Write(" ");
        for (int j = 0; j < i; j++)
            Console.Write("* ");
        Console.WriteLine();
    }
    for (int i = num - 1; i >= 1; i--)
    {
        for (int s = 0; s < num - i; s++)
            Console.Write(" ");
        for (int j = 0; j < i; j++)
            Console.Write("* ");
        Console.WriteLine();
    }
}
```

### Complexity

- **Time:** O(n²)
- **Space:** O(1)

---

## 8. Hollow Rectangle

**Difficulty:** Medium
**Date:** 2026-07-21

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

Single nested loop. At each cell (i, j) print `*` if it's on the border (first row, last row, first col, last col), otherwise print space.

### Solution

```csharp
public static void PrintPattern(int length, int width)
{
    for (int i = 0; i < width; i++)
    {
        for (int j = 0; j < length; j++)
        {
            if (i == 0 || i == width - 1 || j == 0 || j == length - 1)
                Console.Write("*");
            else
                Console.Write(" ");
        }
        Console.WriteLine();
    }
}
```

### Complexity

- **Time:** O(rows × cols)
- **Space:** O(1)

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

## 11. Square

**Difficulty:** Easy
**Date:** 2026-07-21

### Pattern

```
* * * * *
* * * * *
* * * * *
* * * * *
* * * * *
```

### Problem Statement

Given `n`, print a solid square of stars with `n` rows and `n` columns.

### Approach

Both loops run 0 to n — every cell prints a star.

### Solution

```csharp
public static void PrintPattern(int n)
{
    for (int i = 0; i < n; i++)
    {
        for (int j = 0; j < n; j++)
        {
            Console.Write("* ");
        }
        Console.WriteLine();
    }
}
```

### Complexity

- **Time:** O(n²)
- **Space:** O(1)

---

## 12. Hollow Pyramid

**Difficulty:** Medium

### Pattern

```
    *
   * *
  *   *
 *     *
* * * * *
```

### Problem Statement

Given `n`, print a centered pyramid where only the border stars are printed and interior is spaces. First and last rows are solid, middle rows print only the two edge stars.

### Approach

_To be added_

### Solution

_To be added_

### Complexity

- **Time:** -
- **Space:** -

---

## 13. Sandglass

**Difficulty:** Medium

### Pattern

```
* * * * *
 * * * *
  * * *
   * *
    *
   * *
  * * *
 * * * *
* * * * *
```

### Problem Statement

Given `n`, print a sandglass — inverted pyramid on top, pyramid on bottom. Middle row has 1 star.

### Approach

_To be added_

### Solution

_To be added_

### Complexity

- **Time:** -
- **Space:** -

---

## 14. Cross

**Difficulty:** Medium

### Pattern (n=5)

```
    *
  * * *
* * * * *
  * * *
    *
```

### Problem Statement

Given `n` (odd), print a cross/plus shape where the middle row and middle column are filled with stars.

### Approach

_To be added_

### Solution

_To be added_

### Complexity

- **Time:** -
- **Space:** -

---
