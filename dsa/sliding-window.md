# Sliding Window Problems

**Concept:** A window (subarray/substring) slides over data to track max/min/sum/condition without recomputing from scratch.

**When to use:**
- Max/min sum subarray of size K
- Longest substring with condition
- Minimum window substring
- Any contiguous subarray/substring problem

**Complexities:** Time O(n) | Space O(1) or O(k)

---

## Pseudo Code

### Fixed Size Window (size K)

```
initialize window with first K elements
result = compute(window)

for right = K to n-1:
    add s[right] to window
    remove s[right - K] from window     ← element that fell out
    result = max/min/sum(result, window)

return result
```

**When to use:** Problem mentions a fixed size K

---

### Variable Size Window

```
left = 0
result = 0

for right = 0 to n-1:
    add s[right] to window              ← always expand right

    while window condition is violated:
        remove s[left] from window      ← shrink from left
        left++

    result = max(result, right - left + 1)

return result
```

**When to use:** Problem has a condition to satisfy (no repeats, at most K distinct, etc.)

---

### Why nested while loop is still O(n)?

`left` and `right` never reset — they only move forward.
Each element is added once and removed once = 2n operations = O(n).

---

## Table of Contents

| # | Problem | Difficulty | Date Solved |
|---|---------|------------|-------------|
| 1 | [Best Time to Buy and Sell Stock — LC 121](#1-best-time-to-buy-and-sell-stock--lc-121) | Easy | 2026-07-06 |

---

## 1. Best Time to Buy and Sell Stock — LC 121

**LeetCode:** https://leetcode.com/problems/best-time-to-buy-and-sell-stock/
**Difficulty:** Easy
**Date:** 2026-07-06

### Problem Statement

Given an integer array `prices` where `prices[i]` is the price of a stock on the ith day. Choose a single day to buy and a different day in the future to sell. Return the maximum profit. If no profit is possible return `0`.

**Examples:**
```
Input:  prices = [10,1,5,6,7,1]
Output: 6

Input:  prices = [7,6,4,3,1]
Output: 0
```

### Approach

Walk forward once tracking two things — the cheapest price seen so far (buy day) and the max profit seen so far. At each day, if current price is cheaper than min, update the buy day. Otherwise calculate profit if sold today and update max profit. No need to go backwards or restart.

### Solution

```csharp
public class Solution {
    public int MaxProfit(int[] prices) {
        int maxProfit = 0;
        int minBuyingPrice = prices[0];

        for (int i = 0; i < prices.Length; i++)
        {
            if (minBuyingPrice > prices[i])
            {
                minBuyingPrice = prices[i];  // found cheaper buy day
            }
            else
            {
                int profit = prices[i] - minBuyingPrice;
                if (profit > maxProfit)
                {
                    maxProfit = profit;
                }
            }
        }
        return maxProfit;
    }
}
```

### Complexity

- **Time:** O(n) — single pass
- **Space:** O(1)

### Why O(n) and not O(n²)?

Brute force fixes every buy day and checks all future sell days — two nested loops = O(n²). Sliding window walks forward once, always buying at the cheapest price seen so far. One loop, no restarts = O(n).

### Key Takeaway

You don't need to try every buy day. Just track `minPrice` as you go — the cheapest day seen so far is always the best buy day for any future sell day. Single pass is enough.

---
