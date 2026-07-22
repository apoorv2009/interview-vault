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
| 15 | [Multiplication Table](#15-multiplication-table) | Easy |
| 16 | [Checkerboard](#16-checkerboard) | Easy |
| 17 | [Hollow Right Triangle](#17-hollow-right-triangle) | Medium |
| 18 | [Hollow Inverted Triangle](#18-hollow-inverted-triangle) | Medium |
| 19 | [Reverse Left Half Pyramid](#19-reverse-left-half-pyramid) | Medium |
| 20 | [Number Increasing Reverse Pyramid](#20-number-increasing-reverse-pyramid) | Medium |
| 21 | [Hollow Diamond](#21-hollow-diamond) | Hard |
| 22 | [Right Arrow Pattern](#22-right-arrow-pattern) | Hard |
| 23 | [K Pattern](#23-k-pattern) | Hard |
| 24 | [Hollow Reverse Triangle](#24-hollow-reverse-triangle) | Medium |
| 25 | [Zero-One Triangle](#25-zero-one-triangle) | Hard |
| 26 | [Palindrome Triangular](#26-palindrome-triangular) | Hard |
| 27 | [Reverse Number Triangle](#27-reverse-number-triangle) | Medium |
| 28 | [Hollow Hourglass](#28-hollow-hourglass) | Hard |
| 29 | [Normal Left-Aligned Triangle](#29-normal-left-aligned-triangle) | Easy |
| 30 | [Hollow Number Pyramid](#30-hollow-number-pyramid) | Medium |
| 31 | [Hollow Number Staircase](#31-hollow-number-staircase) | Medium |
| 32 | [Left Half Pyramid](#32-left-half-pyramid) | Medium |
| 33 | [Mirror Image Triangle](#33-mirror-image-triangle) | Medium |
| 34 | [Normal Diamond](#34-normal-diamond) | Hard |
| 35 | [Diamond/Arrow Pattern (Odd)](#35-diamondarrow-pattern-odd) | Hard |
| 36 | [Diamond/Arrow Pattern (Even)](#36-diamondarrow-pattern-even) | Hard |
| 37 | [Rhombus Pattern](#37-rhombus-pattern) | Hard |
| 38 | [Right Pascal's Triangle](#38-right-pascals-triangle) | Hard |

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

Leading spaces = `" "` (single space), inner gap = `"  "` (two spaces) to match `"* "` width. First and last rows print all stars. Middle rows print `*` only at j==1 and j==i (edges).

### Solution

```csharp
public static void PrintPattern(int n)
{
    for (int i = 1; i <= n; i++)
    {
        for (int s = 0; s < n - i; s++)
            Console.Write(" ");

        for (int j = 1; j <= i; j++)
        {
            if (i == 1 || i == n)
                Console.Write("* ");
            else if (j == 1 || j == i)
                Console.Write("* ");
            else
                Console.Write("  ");
        }
        Console.WriteLine();
    }
}
```

### Complexity

- **Time:** O(n²)
- **Space:** O(1)

---

## 13. Sandglass

**Difficulty:** Medium
**Date:** 2026-07-21

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

Two loops. Top half: i goes n down to 1 (inverted pyramid). Bottom half: i goes 2 to n (pyramid, skipping middle row to avoid duplicate).

### Solution

```csharp
public static void PrintPattern(int n)
{
    for (int i = n; i >= 1; i--)
    {
        for (int k = 0; k < n - i; k++)
            Console.Write(" ");
        for (int l = 0; l < i; l++)
            Console.Write("* ");
        Console.WriteLine();
    }
    for (int i = 2; i <= n; i++)
    {
        for (int k = 0; k < n - i; k++)
            Console.Write(" ");
        for (int l = 0; l < i; l++)
            Console.Write("* ");
        Console.WriteLine();
    }
}
```

### Complexity

- **Time:** O(n²)
- **Space:** O(1)

---

## 14. Cross

**Difficulty:** Medium
**Date:** 2026-07-22

### Pattern (n=5)

```
    *
    *
* * * * *
    *
    *
```

### Problem Statement

Given `n` (odd), print a plus/cross shape — only the middle row and middle column have stars, everything else is space.

### Approach

Single nested loop. Print `*` if `i == n/2` (middle row) OR `j == n/2` (middle column), else print two spaces.

### Solution

```csharp
public static void PrintPattern(int n)
{
    for (int i = 0; i < n; i++)
    {
        for (int j = 0; j < n; j++)
        {
            if (i == n / 2 || j == n / 2)
                Console.Write("* ");
            else
                Console.Write("  ");
        }
        Console.WriteLine();
    }
}
```

### Complexity

- **Time:** O(n²)
- **Space:** O(1)

---

## 15. Multiplication Table

**Difficulty:** Easy

### Pattern

```
1 2 3 4 5
2 4 6 8 10
3 6 9 12 15
4 8 12 16 20
5 10 15 20 25
```

### Problem Statement

Given `n`, print an n×n multiplication table where cell (i,j) = i × j.

### Approach

_To be added_

### Solution

_To be added_

### Complexity

- **Time:** -
- **Space:** -

---

## 16. Checkerboard

**Difficulty:** Easy

### Pattern

```
* * * * *
 * * * * *
* * * * *
 * * * * *
* * * * *
```

### Problem Statement

Given `n`, print a checkerboard where even rows have a leading space offset.

### Approach

_To be added_

### Solution

_To be added_

### Complexity

- **Time:** -
- **Space:** -

---

## 17. Hollow Right Triangle

**Difficulty:** Medium

### Pattern

```
*
**
* *
*  *
*   *
```

### Problem Statement

Given `n`, print a hollow right triangle — border stars only, interior is spaces.

### Approach

_To be added_

### Solution

_To be added_

### Complexity

- **Time:** -
- **Space:** -

---

## 18. Hollow Inverted Triangle

**Difficulty:** Medium

### Pattern

```
*****
*   *
*  *
* *
*
```

### Problem Statement

Given `n`, print a hollow inverted triangle — first row solid, last column solid, left edge solid, interior spaces.

### Approach

_To be added_

### Solution

_To be added_

### Complexity

- **Time:** -
- **Space:** -

---

## 19. Reverse Left Half Pyramid

**Difficulty:** Medium

### Pattern

```
* * * * *
  * * * *
    * * *
      * *
        *
```

### Problem Statement

Given `n`, print an inverted pyramid that is right-aligned — spaces increase from left as rows decrease.

### Approach

_To be added_

### Solution

_To be added_

### Complexity

- **Time:** -
- **Space:** -

---

## 20. Number Increasing Reverse Pyramid

**Difficulty:** Medium

### Pattern

```
1 2 3 4 5
1 2 3 4
1 2 3
1 2
1
```

### Problem Statement

Given `n`, print a triangle where row `i` prints numbers 1 to (n-i+1), decreasing each row.

### Approach

_To be added_

### Solution

_To be added_

### Complexity

- **Time:** -
- **Space:** -

---

## 21. Hollow Diamond

**Difficulty:** Hard

### Pattern

```
    *
   * *
  *   *
   * *
    *
```

### Problem Statement

Given `n`, print a hollow diamond — only border stars, interior spaces.

### Approach

_To be added_

### Solution

_To be added_

### Complexity

- **Time:** -
- **Space:** -

---

## 22. Right Arrow Pattern

**Difficulty:** Hard

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

Given `n`, print a right-pointing arrow — top half decreases from left, bottom half mirrors it.

### Approach

_To be added_

### Solution

_To be added_

### Complexity

- **Time:** -
- **Space:** -

---

## 23. K Pattern

**Difficulty:** Hard

### Pattern

```
*     *
*   *
* *
*   *
*     *
```

### Problem Statement

Given `n`, print a K shape — left vertical line with stars spreading outward then inward.

### Approach

_To be added_

### Solution

_To be added_

### Complexity

- **Time:** -
- **Space:** -

---

## 24. Hollow Reverse Triangle

**Difficulty:** Medium

### Pattern

```
* * * * *
*     *
*   *
* *
*
```

### Problem Statement

Given `n`, print a hollow inverted right triangle — first row solid, then only border stars on left and right edges.

### Approach

_To be added_

### Solution

_To be added_

### Complexity

- **Time:** -
- **Space:** -

---

## 25. Zero-One Triangle

**Difficulty:** Hard

### Pattern

```
1
0 1
1 0 1
0 1 0 1
1 0 1 0 1
```

### Problem Statement

Given `n`, print a triangle where values alternate between 0 and 1. First value of row i is `i % 2` (or `(i+1) % 2`).

### Approach

_To be added_

### Solution

_To be added_

### Complexity

- **Time:** -
- **Space:** -

---

## 26. Palindrome Triangular

**Difficulty:** Hard

### Pattern

```
1
1 2 1
1 2 3 2 1
1 2 3 4 3 2 1
1 2 3 4 5 4 3 2 1
```

### Problem Statement

Given `n`, print a palindrome triangle — row i prints 1 to i then i-1 down to 1.

### Approach

_To be added_

### Solution

_To be added_

### Complexity

- **Time:** -
- **Space:** -

---

## 27. Reverse Number Triangle

**Difficulty:** Medium

### Pattern

```
1 2 3 4
2 3 4
3 4
4
```

### Problem Statement

Given `n`, print a triangle where row i starts from i and prints up to n.

### Approach

_To be added_

### Solution

_To be added_

### Complexity

- **Time:** -
- **Space:** -

---

## 28. Hollow Hourglass

**Difficulty:** Hard

### Pattern

```
* * * * * * * * *
  * * * * * * *
    * * * * *
      * * *
        *
      * * *
    * * * * *
  * * * * * * *
* * * * * * * * *
```

### Problem Statement

Given `n`, print a hollow hourglass — same as sandglass but only border stars, interior spaces.

### Approach

_To be added_

### Solution

_To be added_

### Complexity

- **Time:** -
- **Space:** -

---

## 29. Normal Left-Aligned Triangle

**Difficulty:** Easy

### Pattern

```
    *
   **
  ***
 ****
*****
```

### Problem Statement

Given `n`, print a right triangle that is left-aligned (right-justified) — leading spaces decrease as stars increase.

### Approach

_To be added_

### Solution

_To be added_

### Complexity

- **Time:** -
- **Space:** -

---

## 30. Hollow Number Pyramid

**Difficulty:** Medium

### Pattern

```
1
1 2
1   3
1     4
1       5
```

### Problem Statement

Given `n`, print a hollow number pyramid — first and last number of each row printed, interior filled with spaces.

### Approach

_To be added_

### Solution

_To be added_

### Complexity

- **Time:** -
- **Space:** -

---

## 31. Hollow Number Staircase

**Difficulty:** Medium

### Pattern

```
1
2 2
3   3
4     4
5       5
```

### Problem Statement

Given `n`, print a hollow staircase — row `i` prints `i` on both edges, spaces in between.

### Approach

_To be added_

### Solution

_To be added_

### Complexity

- **Time:** -
- **Space:** -

---

## 32. Left Half Pyramid

**Difficulty:** Medium

### Pattern

```
    *
  * *
* * *
  * *
    *
```

### Problem Statement

Given `n`, print a left half pyramid — top half grows left, bottom half shrinks. Middle row is widest.

### Approach

_To be added_

### Solution

_To be added_

### Complexity

- **Time:** -
- **Space:** -

---

## 33. Mirror Image Triangle

**Difficulty:** Medium

### Pattern

```
        1
      1 2
    1 2 3
  1 2 3 4
1 2 3 4 5
```

### Problem Statement

Given `n`, print a right-aligned number triangle — leading spaces decrease, numbers 1 to i printed per row.

### Approach

_To be added_

### Solution

_To be added_

### Complexity

- **Time:** -
- **Space:** -

---

## 34. Normal Diamond

**Difficulty:** Hard
**Date:** 2026-07-22

### Pattern

```
  *
 ***
*****
 ***
  *
```

### Problem Statement

Given `n`, print a diamond where row `i` has `2*i-1` stars (top half) and mirrors on bottom. Stars are consecutive with no spaces between them.

### Approach

Two loops. Top: i=1 to n, print n-i spaces then 2*i-1 stars. Bottom: i=n-1 to 1, same logic. Start bottom from n-1 to avoid repeating middle row.

### Solution

```csharp
public static void PrintPattern(int n)
{
    for (int i = 1; i <= n; i++)
    {
        for (int j = 0; j < n - i; j++)
            Console.Write(" ");
        for (int k = 0; k < 2 * i - 1; k++)
            Console.Write("* ");
        Console.WriteLine();
    }
    for (int i = n - 1; i >= 1; i--)
    {
        for (int j = 0; j < n - i; j++)
            Console.Write(" ");
        for (int k = 0; k < 2 * i - 1; k++)
            Console.Write("* ");
        Console.WriteLine();
    }
}
```

### Complexity

- **Time:** O(n²)
- **Space:** O(1)

---

## 35. Diamond/Arrow Pattern (Odd)

**Difficulty:** Hard

### Pattern (input 11)

```
*
* * * * *
* * * * * * * * *
* * * * * * * * * * * * *
* * * * * * * * * * *
* * * * *
*
```

### Problem Statement

Given odd `n`, print a diamond/arrow where rows expand by 4 stars each step to widest then shrink symmetrically.

### Approach

_To be added_

### Solution

_To be added_

### Complexity

- **Time:** -
- **Space:** -

---

## 36. Diamond/Arrow Pattern (Even)

**Difficulty:** Hard

### Pattern (input 12)

```
* *
* * * * * *
* * * * * * * * * * * *
* * * * * * * * * * * * * *
* * * * * * * * * * * *
* * * * * *
* *
```

### Problem Statement

Given even `n`, print a diamond/arrow starting with 2 stars, expanding by 4 each step to widest then shrinking symmetrically.

### Approach

_To be added_

### Solution

_To be added_

### Complexity

- **Time:** -
- **Space:** -

---

## 37. Rhombus Pattern

**Difficulty:** Hard

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

Given `n`, print a rhombus (diamond shape with spaces between stars) — pyramid on top, inverted pyramid on bottom.

### Approach

_To be added_

### Solution

_To be added_

### Complexity

- **Time:** -
- **Space:** -

---

## 38. Right Pascal's Triangle

**Difficulty:** Hard

### Pattern

```
1
1 1
1 2 1
1 3 3 1
1 4 6 4 1
1 3 3 1
1 2 1
1 1
1
```

### Problem Statement

Given `n`, print Pascal's triangle mirrored — top half expands (normal Pascal's), bottom half shrinks back to single 1.

### Approach

_To be added_

### Solution

_To be added_

### Complexity

- **Time:** -
- **Space:** -

---
