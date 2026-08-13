# Pagination API — All Code, One File (Notepad/No-IDE Reference)

This is everything from the layered solution, laid out as ONE file so you can
scroll/study it linearly. Content is grouped **by pagination approach** — each
approach section is a full vertical slice (models → repository → service →
controller → Angular), so you can read one approach top-to-bottom without
jumping around. Shared, approach-agnostic scaffolding (entity, DTOs,
DbContext, generic repository, DI wiring) lives once in **Part 0**, since it
doesn't change across approaches.

Four approaches are covered:

1. **Offset-based** — `page` + `pageSize` (`LIMIT`/`OFFSET`)
2. **Cursor / keyset-based** — opaque cursor built from the last row's `Id`
3. **Time-based cursor** — same idea as #2, but the cursor is a timestamp (+ tie-breaker), used for feeds/logs
4. **Client-side** — fetch everything once (capped), page through it in the browser

In the actual round you obviously won't type all of this — see **"What to
actually write in 60 minutes"** at the very bottom. Each code block is
labeled with the folder/file it *would* live in — just say that out loud
("this would go in my Repository layer") rather than actually creating
folders.

---

## Table of Contents

| # | Section | File / Location |
|---|---------|------------------|
| — | [Conceptual folder structure](#conceptual-folder-structure-say-this-out-loud-dont-create-it) | — |
| **Part 0 — Shared Foundation** | | |
| 1 | [Entity](#1-entity--domainentitiesproductcs) | `Domain/Entities/Product.cs` |
| 2 | [DTOs](#2-dtos--applicationdtosproductdtoscs) | `Application/DTOs/ProductDtos.cs` |
| 3 | [Base repository & Unit of Work interfaces](#3-base-repository--unit-of-work-interfaces--domaininterfaces) | `Domain/Interfaces/` |
| 4 | [EF Core DbContext](#4-ef-core-dbcontext--infrastructurepersistenceappdbcontextcs) | `Infrastructure/Persistence/AppDbContext.cs` |
| 5 | [EF Fluent API config](#5-ef-fluent-api-config--infrastructurepersistenceconfigurationsproductconfigurationcs) | `Infrastructure/Persistence/Configurations/ProductConfiguration.cs` |
| 6 | [Generic repository implementation](#6-generic-repository-implementation--infrastructurepersistencerepositoriesgenericrepositorycs) | `Infrastructure/Persistence/Repositories/GenericRepository.cs` |
| 7 | [Unit of Work](#7-unit-of-work--infrastructurepersistenceunitofworkcs) | `Infrastructure/Persistence/UnitOfWork.cs` |
| 8 | [Controller & service skeletons](#8-controller--service-skeletons) | `API/Controllers/`, `Application/Services/` |
| 9 | [DI wiring](#9-di-wiring--apiprogramcs) | `API/Program.cs` |
| 10 | [Angular shared setup](#10-angular-shared-setup) | `src/app/...` |
| **Approach 1 — Offset-Based Pagination** | | |
| 11 | [When to use](#11-when-to-use--approach-1-offset-based) | — |
| 12 | [Pagination models](#12-pagination-models--domaincommonpaginationmodelscs) | `Domain/Common/PaginationModels.cs` |
| 13 | [Repository — interface + implementation](#13-repository--interface--implementation) | `Domain/Interfaces/`, `Infrastructure/.../ProductRepository.cs` |
| 14 | [Service — interface + implementation](#14-service--interface--implementation) | `Application/Interfaces/`, `Application/Services/ProductService.cs` |
| 15 | [Controller endpoint](#15-controller-endpoint) | `API/Controllers/ProductsController.cs` |
| 16 | [Angular — model + service + component](#16-angular--model--service--component-page-numbered-list) | `src/app/...` (page-numbered list) |
| **Approach 2 — Cursor-Based (Keyset) Pagination** | | |
| 17 | [When to use](#17-when-to-use--approach-2-cursor-based) | — |
| 18 | [Pagination models](#18-pagination-models--domaincommonpaginationmodelscs) | `Domain/Common/PaginationModels.cs` |
| 19 | [Cursor encode/decode helper](#19-cursor-encodedecode-helper--applicationservicescursorcodeccs) | `Application/Services/CursorCodec.cs` |
| 20 | [Repository — interface + implementation](#20-repository--interface--implementation) | `Domain/Interfaces/`, `Infrastructure/.../ProductRepository.cs` |
| 21 | [Service — interface + implementation](#21-service--interface--implementation) | `Application/Interfaces/`, `Application/Services/ProductService.cs` |
| 22 | [Controller endpoint](#22-controller-endpoint) | `API/Controllers/ProductsController.cs` |
| 23 | [Angular — model + service + component](#23-angular--model--service--component-infinite-scroll) | `src/app/...` (infinite scroll) |
| 24 | [Mandatory requirement](#24-mandatory-requirement--unique-indexed-sort-column) | unique indexed sort column |
| **Approach 3 — Time-Based Cursor Pagination** | | |
| 25 | [When to use](#25-when-to-use--approach-3-time-based-cursor) | — |
| 26 | [Pagination models](#26-pagination-models--domaincommonpaginationmodelscs) | `Domain/Common/PaginationModels.cs` |
| 27 | [Cursor encode/decode helper](#27-cursor-encodedecode-helper--applicationservicestimecursorcodeccs) | `Application/Services/TimeCursorCodec.cs` |
| 28 | [Repository — interface + implementation](#28-repository--interface--implementation) | `Domain/Interfaces/`, `Infrastructure/.../ProductRepository.cs` |
| 29 | [Service — interface + implementation](#29-service--interface--implementation) | `Application/Interfaces/`, `Application/Services/ProductService.cs` |
| 30 | [Controller endpoint](#30-controller-endpoint) | `API/Controllers/ProductsController.cs` |
| 31 | [Angular — model + service + component](#31-angular--model--service--component-live-feed) | `src/app/...` (live feed / poll) |
| 32 | [Indexing note](#32-indexing-note) | composite index |
| **Approach 4 — Client-Side Pagination** | | |
| 33 | [When to use (and when NOT to)](#33-when-to-use--approach-4-client-side-and-when-not-to) | — |
| 34 | [Repository + Service + Controller](#34-repository--service--controller--capped-get-all) | capped "get all" |
| 35 | [Angular — model + service + component](#35-angular--model--service--component-in-memory-paging) | `src/app/...` (in-memory paging) |
| 36 | [Guardrails](#36-guardrails) | — |
| **Wrap-up** | | |
| 37 | [Specification pattern (bonus)](#37-specification-pattern-bonus-mention-if-time-allows--applicationspecifications) | `Application/Specifications/` |
| — | [SOLID — one line each](#solid--one-line-each-memorize-these) | — |
| — | [Approach comparison table](#pagination-approach-comparison--offset-vs-cursor-vs-time-based-vs-client-side) | — |
| — | [What to actually write in 60 minutes](#what-to-actually-write-in-60-minutes-no-ide) | — |
| — | [Anticipated Follow-Up Questions (with Answers)](#anticipated-follow-up-questions-with-answers) | — |
| — | ↳ [Architecture & design patterns](#architecture--design-patterns) | — |
| — | ↳ [Pagination trade-offs](#pagination-trade-offs) | — |
| — | ↳ [EF Core / data layer](#ef-core--data-layer) | — |
| — | ↳ [API / REST design](#api--rest-design) | — |
| — | ↳ [Security](#security) | — |
| — | ↳ [Performance & scalability](#performance--scalability) | — |
| — | ↳ [Angular / frontend](#angular--frontend) | — |
| — | ↳ [Testing](#testing) | — |

---

## Conceptual folder structure (say this out loud, don't create it)

```
Domain/            → Entities, interfaces, pagination models (no dependencies)
Application/       → Services, DTOs (business logic)
Infrastructure/    → EF Core, repository implementations (data access)
API/                → Controllers, Program.cs (HTTP layer)
```

---

# Part 0 — Shared Foundation (same across all 4 approaches)

## 1. Entity — (Domain/Entities/Product.cs)

```csharp
public class Product
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public DateTime CreatedAt { get; set; }
    public bool IsActive { get; set; } = true;
}
```

---

## 2. DTOs — (Application/DTOs/ProductDtos.cs)

```csharp
public class ProductDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public decimal Price { get; set; }
}

public class CreateProductDto
{
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public decimal Price { get; set; }
}
```

---

## 3. Base repository & Unit of Work interfaces — (Domain/Interfaces/)

`IProductRepository` and `IProductService` accumulate one pagination method
per approach — each is shown incrementally in its approach section below.
Everything else here is fixed regardless of approach.

```csharp
// IGenericRepository.cs
public interface IGenericRepository<T> where T : class
{
    Task<T?> GetByIdAsync(int id);
    Task<IReadOnlyList<T>> GetAllAsync();
    Task AddAsync(T entity);
    void Update(T entity);
    void Delete(T entity);
    IQueryable<T> Query();
}

// IProductRepository.cs (skeleton — each approach below adds one method)
public interface IProductRepository : IGenericRepository<Product>
{
}

// IUnitOfWork.cs
public interface IUnitOfWork : IDisposable
{
    IProductRepository Products { get; }
    Task<int> SaveChangesAsync();
}
```

---

## 4. EF Core DbContext — (Infrastructure/Persistence/AppDbContext.cs)

```csharp
using Microsoft.EntityFrameworkCore;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Product> Products => Set<Product>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfiguration(new ProductConfiguration());
    }
}
```

---

## 5. EF Fluent API config — (Infrastructure/Persistence/Configurations/ProductConfiguration.cs)

```csharp
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

public class ProductConfiguration : IEntityTypeConfiguration<Product>
{
    public void Configure(EntityTypeBuilder<Product> builder)
    {
        builder.ToTable("Products");
        builder.HasKey(p => p.Id);

        builder.Property(p => p.Name).IsRequired().HasMaxLength(200);
        builder.Property(p => p.Category).IsRequired().HasMaxLength(100);
        builder.Property(p => p.Price).HasColumnType("decimal(18,2)");

        // Sort/filter columns must be indexed - mandatory for offset, cursor and time-based pagination
        builder.HasIndex(p => p.Category);
        builder.HasIndex(p => p.Id).IsUnique();

        // Approach 3 (time-based cursor) adds a composite index here — see section 32
    }
}
```

---

## 6. Generic repository implementation — (Infrastructure/Persistence/Repositories/GenericRepository.cs)

```csharp
using Microsoft.EntityFrameworkCore;

public class GenericRepository<T> : IGenericRepository<T> where T : class
{
    protected readonly AppDbContext _context;
    protected readonly DbSet<T> _dbSet;

    public GenericRepository(AppDbContext context)
    {
        _context = context;
        _dbSet = context.Set<T>();
    }

    public async Task<T?> GetByIdAsync(int id) => await _dbSet.FindAsync(id);
    public async Task<IReadOnlyList<T>> GetAllAsync() => await _dbSet.ToListAsync();
    public async Task AddAsync(T entity) => await _dbSet.AddAsync(entity);
    public void Update(T entity) => _dbSet.Update(entity);
    public void Delete(T entity) => _dbSet.Remove(entity);
    public IQueryable<T> Query() => _dbSet.AsNoTracking();
}

// ProductRepository.cs (skeleton — each approach below adds one method)
public class ProductRepository : GenericRepository<Product>, IProductRepository
{
    public ProductRepository(AppDbContext context) : base(context) { }
}
```

---

## 7. Unit of Work — (Infrastructure/Persistence/UnitOfWork.cs)

```csharp
public class UnitOfWork : IUnitOfWork
{
    private readonly AppDbContext _context;
    private IProductRepository? _products;

    public UnitOfWork(AppDbContext context)
    {
        _context = context;
    }

    public IProductRepository Products => _products ??= new ProductRepository(_context);

    public async Task<int> SaveChangesAsync() => await _context.SaveChangesAsync();

    public void Dispose() => _context.Dispose();
}
```

---

## 8. Controller & service skeletons

```csharp
// Application/Interfaces/IProductService.cs (skeleton — each approach below adds one method)
public interface IProductService
{
    Task<ProductDto> CreateAsync(CreateProductDto dto);
}

// Application/Services/ProductService.cs (skeleton — each approach below adds one method)
public class ProductService : IProductService
{
    private readonly IUnitOfWork _unitOfWork;

    public ProductService(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<ProductDto> CreateAsync(CreateProductDto dto)
    {
        var product = new Product
        {
            Name = dto.Name,
            Category = dto.Category,
            Price = dto.Price,
            CreatedAt = DateTime.UtcNow,
            IsActive = true
        };

        await _unitOfWork.Products.AddAsync(product);
        await _unitOfWork.SaveChangesAsync();

        return MapToDto(product);
    }

    private static ProductDto MapToDto(Product p) => new()
    {
        Id = p.Id,
        Name = p.Name,
        Category = p.Category,
        Price = p.Price
    };
}
```

```csharp
// API/Controllers/ProductsController.cs (skeleton — each approach below adds one [HttpGet] action)
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/[controller]")]
public class ProductsController : ControllerBase
{
    private readonly IProductService _productService;

    public ProductsController(IProductService productService)
    {
        _productService = productService;
    }

    [HttpPost]
    public async Task<ActionResult<ProductDto>> Create([FromBody] CreateProductDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var created = await _productService.CreateAsync(dto);
        return Ok(created);
    }
}
```

---

## 9. DI wiring — (API/Program.cs)

```csharp
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddScoped<IProductRepository, ProductRepository>();
builder.Services.AddScoped<IUnitOfWork, UnitOfWork>();
builder.Services.AddScoped<IProductService, ProductService>();

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddCors(options =>
    options.AddDefaultPolicy(p => p.WithOrigins("http://localhost:4200").AllowAnyHeader().AllowAnyMethod()));

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors();
app.UseAuthorization();
app.MapControllers();
app.Run();
```

---

## 10. Angular shared setup

```typescript
// src/app/app.config.ts
import { ApplicationConfig } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';

export const appConfig: ApplicationConfig = {
  providers: [provideHttpClient()]
};
```

```typescript
// src/environments/environment.ts
export const environment = {
  apiBaseUrl: 'https://localhost:5001'
};
```

```typescript
// src/app/models/product.models.ts (skeleton — each approach below adds one result-shape interface)
export interface ProductDto {
  id: number;
  name: string;
  category: string;
  price: number;
}
```

```typescript
// src/app/services/product.service.ts (skeleton — each approach below adds one method)
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ProductDto } from '../models/product.models';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiBaseUrl}/api/products`;
}
```

---

# Approach 1 — Offset-Based Pagination (page / pageSize)

## 11. When to use — Approach 1 (Offset-Based)

Admin/reporting UIs and grids that need page numbers and a total-row count,
on modest datasets. Cheap to reason about, but `OFFSET` gets slower the
deeper you page, and rows can shift between requests if the underlying data
changes ("page drift").

## 12. Pagination models — (Domain/Common/PaginationModels.cs)

```csharp
// ---------- APPROACH 1: OFFSET-BASED ----------
public class PaginationParams
{
    private const int MaxPageSize = 100;
    private int _pageSize = 20;

    public int Page { get; set; } = 1;

    public int PageSize
    {
        get => _pageSize;
        set => _pageSize = value > MaxPageSize ? MaxPageSize : (value < 1 ? 20 : value);
    }
}

public class PagedResult<T>
{
    public IReadOnlyList<T> Items { get; set; } = new List<T>();
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalCount { get; set; }
    public int TotalPages => PageSize == 0 ? 0 : (int)Math.Ceiling(TotalCount / (double)PageSize);
    public bool HasPrevious => Page > 1;
    public bool HasNext => Page < TotalPages;
}
```

## 13. Repository — interface + implementation

```csharp
// add to Domain/Interfaces/IProductRepository.cs
Task<(IReadOnlyList<Product> Items, int TotalCount)> GetOffsetPagedAsync(
    int page, int pageSize, string? category = null);
```

```csharp
// add to Infrastructure/Persistence/Repositories/ProductRepository.cs
using Microsoft.EntityFrameworkCore;

public async Task<(IReadOnlyList<Product> Items, int TotalCount)> GetOffsetPagedAsync(
    int page, int pageSize, string? category = null)
{
    IQueryable<Product> query = _dbSet.AsNoTracking().Where(p => p.IsActive);

    if (!string.IsNullOrWhiteSpace(category))
        query = query.Where(p => p.Category == category);

    var totalCount = await query.CountAsync();

    var items = await query
        .OrderBy(p => p.Id)
        .Skip((page - 1) * pageSize)
        .Take(pageSize)
        .ToListAsync();

    return (items, totalCount);
}
```

## 14. Service — interface + implementation

```csharp
// add to Application/Interfaces/IProductService.cs
Task<PagedResult<ProductDto>> GetOffsetPagedAsync(PaginationParams paginationParams, string? category);
```

```csharp
// add to Application/Services/ProductService.cs
public async Task<PagedResult<ProductDto>> GetOffsetPagedAsync(
    PaginationParams paginationParams, string? category)
{
    var (items, totalCount) = await _unitOfWork.Products.GetOffsetPagedAsync(
        paginationParams.Page, paginationParams.PageSize, category);

    return new PagedResult<ProductDto>
    {
        Items = items.Select(MapToDto).ToList(),
        Page = paginationParams.Page,
        PageSize = paginationParams.PageSize,
        TotalCount = totalCount
    };
}
```

## 15. Controller endpoint

```csharp
// add to API/Controllers/ProductsController.cs
// GET api/products?page=1&pageSize=20&category=Electronics
[HttpGet]
public async Task<ActionResult<PagedResult<ProductDto>>> GetOffsetPaged(
    [FromQuery] PaginationParams paginationParams,
    [FromQuery] string? category)
{
    var result = await _productService.GetOffsetPagedAsync(paginationParams, category);
    return Ok(result);
}
```

## 16. Angular — model + service + component (page-numbered list)

```typescript
// add to src/app/models/product.models.ts
export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
}
```

```typescript
// add to src/app/services/product.service.ts
import { PagedResult, ProductDto } from '../models/product.models';

// Offset-based — GET api/products?page=1&pageSize=20&category=Electronics
getOffsetPaged(page: number, pageSize: number, category?: string): Observable<PagedResult<ProductDto>> {
  let params = new HttpParams().set('page', page).set('pageSize', pageSize);
  if (category) params = params.set('category', category);

  return this.http.get<PagedResult<ProductDto>>(this.baseUrl, { params });
}
```

```typescript
// src/app/components/product-list/product-list.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductService } from '../../services/product.service';
import { ProductDto } from '../../models/product.models';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <table>
      <tr *ngFor="let p of items">
        <td>{{ p.name }}</td>
        <td>{{ p.category }}</td>
        <td>{{ p.price | currency }}</td>
      </tr>
    </table>

    <button [disabled]="!hasPrevious" (click)="goTo(page - 1)">Previous</button>
    <span>Page {{ page }} of {{ totalPages }}</span>
    <button [disabled]="!hasNext" (click)="goTo(page + 1)">Next</button>
  `
})
export class ProductListComponent implements OnInit {
  private productService = inject(ProductService);

  items: ProductDto[] = [];
  page = 1;
  pageSize = 20;
  totalPages = 0;
  hasPrevious = false;
  hasNext = false;

  ngOnInit(): void {
    this.load();
  }

  goTo(page: number): void {
    this.page = page;
    this.load();
  }

  private load(): void {
    this.productService.getOffsetPaged(this.page, this.pageSize).subscribe(result => {
      this.items = result.items;
      this.totalPages = result.totalPages;
      this.hasPrevious = result.hasPrevious;
      this.hasNext = result.hasNext;
    });
  }
}
```

---

# Approach 2 — Cursor-Based (Keyset) Pagination

## 17. When to use — Approach 2 (Cursor-Based)

Infinite-scroll feeds and large, high-write tables. Avoids page drift and
stays fast at any depth — no `OFFSET` means the DB never has to scan and
discard skipped rows; it seeks straight to `WHERE Id > lastId`.

## 18. Pagination models — (Domain/Common/PaginationModels.cs)

```csharp
// ---------- APPROACH 2: CURSOR / KEYSET-BASED (by Id) ----------
public class CursorPaginationParams
{
    private const int MaxLimit = 100;
    private int _limit = 20;

    public string? Cursor { get; set; }

    public int Limit
    {
        get => _limit;
        set => _limit = value > MaxLimit ? MaxLimit : (value < 1 ? 20 : value);
    }
}

public class CursorPagedResult<T>
{
    public IReadOnlyList<T> Items { get; set; } = new List<T>();
    public string? NextCursor { get; set; }
    public bool HasMore { get; set; }
}
```

## 19. Cursor encode/decode helper — (Application/Services/CursorCodec.cs)

```csharp
using System.Text;

public static class CursorCodec
{
    public static string Encode(int id) =>
        Convert.ToBase64String(Encoding.UTF8.GetBytes(id.ToString()));

    public static int? Decode(string? cursor)
    {
        if (string.IsNullOrWhiteSpace(cursor)) return null;
        try
        {
            var raw = Encoding.UTF8.GetString(Convert.FromBase64String(cursor));
            return int.TryParse(raw, out var id) ? id : null;
        }
        catch (FormatException)
        {
            return null; // invalid/tampered cursor -> start from beginning
        }
    }
}
```

## 20. Repository — interface + implementation

```csharp
// add to Domain/Interfaces/IProductRepository.cs
Task<(IReadOnlyList<Product> Items, bool HasMore)> GetCursorPagedAsync(
    int? lastId, int limit, string? category = null);
```

```csharp
// add to Infrastructure/Persistence/Repositories/ProductRepository.cs
public async Task<(IReadOnlyList<Product> Items, bool HasMore)> GetCursorPagedAsync(
    int? lastId, int limit, string? category = null)
{
    IQueryable<Product> query = _dbSet.AsNoTracking().Where(p => p.IsActive);

    if (!string.IsNullOrWhiteSpace(category))
        query = query.Where(p => p.Category == category);

    if (lastId.HasValue)
        query = query.Where(p => p.Id > lastId.Value);

    var items = await query
        .OrderBy(p => p.Id)
        .Take(limit + 1)   // fetch one extra to know if more exist
        .ToListAsync();

    bool hasMore = items.Count > limit;
    if (hasMore) items.RemoveAt(items.Count - 1);

    return (items, hasMore);
}
```

## 21. Service — interface + implementation

```csharp
// add to Application/Interfaces/IProductService.cs
Task<CursorPagedResult<ProductDto>> GetCursorPagedAsync(CursorPaginationParams cursorParams, string? category);
```

```csharp
// add to Application/Services/ProductService.cs
public async Task<CursorPagedResult<ProductDto>> GetCursorPagedAsync(
    CursorPaginationParams cursorParams, string? category)
{
    int? lastId = CursorCodec.Decode(cursorParams.Cursor);

    var (items, hasMore) = await _unitOfWork.Products.GetCursorPagedAsync(
        lastId, cursorParams.Limit, category);

    return new CursorPagedResult<ProductDto>
    {
        Items = items.Select(MapToDto).ToList(),
        HasMore = hasMore,
        NextCursor = items.Any() ? CursorCodec.Encode(items.Last().Id) : null
    };
}
```

## 22. Controller endpoint

```csharp
// add to API/Controllers/ProductsController.cs
// GET api/products/cursor?cursor=xyz&limit=20&category=Electronics
[HttpGet("cursor")]
public async Task<ActionResult<CursorPagedResult<ProductDto>>> GetCursorPaged(
    [FromQuery] CursorPaginationParams cursorParams,
    [FromQuery] string? category)
{
    var result = await _productService.GetCursorPagedAsync(cursorParams, category);
    return Ok(result);
}
```

## 23. Angular — model + service + component (infinite scroll)

```typescript
// add to src/app/models/product.models.ts
export interface CursorPagedResult<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}
```

```typescript
// add to src/app/services/product.service.ts
import { CursorPagedResult } from '../models/product.models';

// Cursor-based — GET api/products/cursor?cursor=xyz&limit=20&category=Electronics
getCursorPaged(cursor: string | null, limit: number, category?: string): Observable<CursorPagedResult<ProductDto>> {
  let params = new HttpParams().set('limit', limit);
  if (cursor) params = params.set('cursor', cursor);
  if (category) params = params.set('category', category);

  return this.http.get<CursorPagedResult<ProductDto>>(`${this.baseUrl}/cursor`, { params });
}
```

```typescript
// src/app/components/product-infinite/product-infinite.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductService } from '../../services/product.service';
import { ProductDto } from '../../models/product.models';

@Component({
  selector: 'app-product-infinite',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngFor="let p of items">{{ p.name }} — {{ p.price | currency }}</div>
    <button [disabled]="!hasMore || loading" (click)="loadMore()">
      {{ loading ? 'Loading…' : 'Load more' }}
    </button>
  `
})
export class ProductInfiniteComponent implements OnInit {
  private productService = inject(ProductService);

  items: ProductDto[] = [];
  cursor: string | null = null;
  hasMore = true;
  loading = false;

  ngOnInit(): void {
    this.loadMore();
  }

  loadMore(): void {
    if (this.loading || !this.hasMore) return;
    this.loading = true;

    this.productService.getCursorPaged(this.cursor, 20).subscribe(result => {
      this.items = [...this.items, ...result.items];
      this.cursor = result.nextCursor;
      this.hasMore = result.hasMore;
      this.loading = false;
    });
  }
}
```

## 24. Mandatory requirement — unique indexed sort column

The `ORDER BY` column **must be unique and indexed** (`Id` / PK is the safe
default), otherwise rows can be skipped or duplicated when two rows tie on
the sort key.

---

# Approach 3 — Time-Based Cursor Pagination

## 25. When to use — Approach 3 (Time-Based Cursor)

Same mechanism as Approach 2 (seek, no `OFFSET`), but the cursor encodes a
**timestamp** instead of an `Id`. Natural fit for activity feeds, logs, or
"show me what's new since I last checked" — the client can ask for
`CreatedAt > X` directly, which an ID-based cursor can't express as cleanly
when the feed is conceptually time-ordered rather than insertion-ordered.

## 26. Pagination models — (Domain/Common/PaginationModels.cs)

```csharp
// ---------- APPROACH 3: TIME-BASED CURSOR ----------
public class TimeCursorPaginationParams
{
    private const int MaxLimit = 100;
    private int _limit = 20;

    public string? Cursor { get; set; }

    public int Limit
    {
        get => _limit;
        set => _limit = value > MaxLimit ? MaxLimit : (value < 1 ? 20 : value);
    }
}

public class TimeCursorPagedResult<T>
{
    public IReadOnlyList<T> Items { get; set; } = new List<T>();
    public string? NextCursor { get; set; }
    public bool HasMore { get; set; }
}
```

## 27. Cursor encode/decode helper — (Application/Services/TimeCursorCodec.cs)

```csharp
using System.Text;

public static class TimeCursorCodec
{
    // cursor = base64("{CreatedAtTicks}|{Id}") — timestamp is the primary sort
    // key, Id is the tie-breaker for rows with an identical CreatedAt
    public static string Encode(DateTime createdAt, int id) =>
        Convert.ToBase64String(Encoding.UTF8.GetBytes($"{createdAt.Ticks}|{id}"));

    public static (DateTime CreatedAt, int Id)? Decode(string? cursor)
    {
        if (string.IsNullOrWhiteSpace(cursor)) return null;
        try
        {
            var raw = Encoding.UTF8.GetString(Convert.FromBase64String(cursor));
            var parts = raw.Split('|');
            if (parts.Length != 2) return null;
            if (!long.TryParse(parts[0], out var ticks)) return null;
            if (!int.TryParse(parts[1], out var id)) return null;

            return (new DateTime(ticks), id);
        }
        catch (FormatException)
        {
            return null; // invalid/tampered cursor -> start from beginning
        }
    }
}
```

## 28. Repository — interface + implementation

```csharp
// add to Domain/Interfaces/IProductRepository.cs
Task<(IReadOnlyList<Product> Items, bool HasMore)> GetTimeCursorPagedAsync(
    DateTime? afterCreatedAt, int? afterId, int limit, string? category = null);
```

```csharp
// add to Infrastructure/Persistence/Repositories/ProductRepository.cs
public async Task<(IReadOnlyList<Product> Items, bool HasMore)> GetTimeCursorPagedAsync(
    DateTime? afterCreatedAt, int? afterId, int limit, string? category = null)
{
    IQueryable<Product> query = _dbSet.AsNoTracking().Where(p => p.IsActive);

    if (!string.IsNullOrWhiteSpace(category))
        query = query.Where(p => p.Category == category);

    if (afterCreatedAt.HasValue && afterId.HasValue)
    {
        query = query.Where(p =>
            p.CreatedAt > afterCreatedAt.Value ||
            (p.CreatedAt == afterCreatedAt.Value && p.Id > afterId.Value));
    }

    var items = await query
        .OrderBy(p => p.CreatedAt).ThenBy(p => p.Id)
        .Take(limit + 1)   // fetch one extra to know if more exist
        .ToListAsync();

    bool hasMore = items.Count > limit;
    if (hasMore) items.RemoveAt(items.Count - 1);

    return (items, hasMore);
}
```

## 29. Service — interface + implementation

```csharp
// add to Application/Interfaces/IProductService.cs
Task<TimeCursorPagedResult<ProductDto>> GetTimeCursorPagedAsync(TimeCursorPaginationParams pagingParams, string? category);
```

```csharp
// add to Application/Services/ProductService.cs
public async Task<TimeCursorPagedResult<ProductDto>> GetTimeCursorPagedAsync(
    TimeCursorPaginationParams pagingParams, string? category)
{
    var decoded = TimeCursorCodec.Decode(pagingParams.Cursor);

    var (items, hasMore) = await _unitOfWork.Products.GetTimeCursorPagedAsync(
        decoded?.CreatedAt, decoded?.Id, pagingParams.Limit, category);

    var last = items.LastOrDefault();

    return new TimeCursorPagedResult<ProductDto>
    {
        Items = items.Select(MapToDto).ToList(),
        HasMore = hasMore,
        NextCursor = last is not null ? TimeCursorCodec.Encode(last.CreatedAt, last.Id) : null
    };
}
```

## 30. Controller endpoint

```csharp
// add to API/Controllers/ProductsController.cs
// GET api/products/since?cursor=xyz&limit=20&category=Electronics
[HttpGet("since")]
public async Task<ActionResult<TimeCursorPagedResult<ProductDto>>> GetTimeCursorPaged(
    [FromQuery] TimeCursorPaginationParams pagingParams,
    [FromQuery] string? category)
{
    var result = await _productService.GetTimeCursorPagedAsync(pagingParams, category);
    return Ok(result);
}
```

## 31. Angular — model + service + component (live feed)

```typescript
// add to src/app/models/product.models.ts
export interface TimeCursorPagedResult<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}
```

```typescript
// add to src/app/services/product.service.ts
import { TimeCursorPagedResult } from '../models/product.models';

// Time-based cursor — GET api/products/since?cursor=xyz&limit=20&category=Electronics
getTimeCursorPaged(cursor: string | null, limit: number, category?: string): Observable<TimeCursorPagedResult<ProductDto>> {
  let params = new HttpParams().set('limit', limit);
  if (cursor) params = params.set('cursor', cursor);
  if (category) params = params.set('category', category);

  return this.http.get<TimeCursorPagedResult<ProductDto>>(`${this.baseUrl}/since`, { params });
}
```

```typescript
// src/app/components/product-feed/product-feed.component.ts
import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { interval, Subscription } from 'rxjs';
import { ProductService } from '../../services/product.service';
import { ProductDto } from '../../models/product.models';

@Component({
  selector: 'app-product-feed',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngFor="let p of items">{{ p.name }} — {{ p.price | currency }}</div>
    <button (click)="checkForNew()">Refresh</button>
  `
})
export class ProductFeedComponent implements OnInit, OnDestroy {
  private productService = inject(ProductService);
  private pollSub?: Subscription;

  items: ProductDto[] = [];
  private latestCursor: string | null = null;

  ngOnInit(): void {
    this.checkForNew();
    this.pollSub = interval(15000).subscribe(() => this.checkForNew());
  }

  ngOnDestroy(): void {
    this.pollSub?.unsubscribe();
  }

  checkForNew(): void {
    this.productService.getTimeCursorPaged(this.latestCursor, 20).subscribe(result => {
      if (result.items.length) {
        this.items = [...result.items, ...this.items]; // newest first
        this.latestCursor = result.nextCursor;
      }
    });
  }
}
```

## 32. Indexing note

Add a composite index on the sort columns so the `WHERE CreatedAt > @x OR
(CreatedAt = @x AND Id > @y)` seek stays an index seek instead of a scan:

```csharp
// add to ProductConfiguration.Configure(...)
builder.HasIndex(p => new { p.CreatedAt, p.Id });
```

---

# Approach 4 — Client-Side Pagination

## 33. When to use — Approach 4 (Client-Side), and when NOT to

Only for **small, mostly-static** datasets (reference/lookup lists, admin
dropdowns) where fetching everything once is cheaper than round-tripping for
every page. **Do not** use this for anything that scales with users, orders,
logs, or events — it doesn't reduce payload size, doesn't reduce DB load, and
gets worse over time as the table grows. It's "pagination" only in the UI —
the server still returns the whole (capped) dataset in one call.

## 34. Repository + Service + Controller — capped "get all"

```csharp
// add to Domain/Interfaces/IProductRepository.cs
Task<IReadOnlyList<Product>> GetForClientPagingAsync(string? category, int hardCap);
```

```csharp
// add to Infrastructure/Persistence/Repositories/ProductRepository.cs
public async Task<IReadOnlyList<Product>> GetForClientPagingAsync(string? category, int hardCap)
{
    IQueryable<Product> query = _dbSet.AsNoTracking().Where(p => p.IsActive);

    if (!string.IsNullOrWhiteSpace(category))
        query = query.Where(p => p.Category == category);

    return await query.OrderBy(p => p.Id).Take(hardCap).ToListAsync();
}
```

```csharp
// add to Application/Interfaces/IProductService.cs
Task<IReadOnlyList<ProductDto>> GetAllForClientPagingAsync(string? category);
```

```csharp
// add to Application/Services/ProductService.cs
public async Task<IReadOnlyList<ProductDto>> GetAllForClientPagingAsync(string? category)
{
    const int hardCap = 500; // guardrail — never let "return everything" become "return millions"

    var items = await _unitOfWork.Products.GetForClientPagingAsync(category, hardCap);
    return items.Select(MapToDto).ToList();
}
```

```csharp
// add to API/Controllers/ProductsController.cs
// GET api/products/all?category=Electronics — capped, client slices/pages in memory
[HttpGet("all")]
public async Task<ActionResult<IReadOnlyList<ProductDto>>> GetAllForClientPaging([FromQuery] string? category)
{
    var result = await _productService.GetAllForClientPagingAsync(category);
    return Ok(result);
}
```

## 35. Angular — model + service + component (in-memory paging)

No new result-shape model needed — the endpoint returns a plain `ProductDto[]`.

```typescript
// add to src/app/services/product.service.ts
// Client-side — GET api/products/all?category=Electronics (capped batch; UI pages through it)
getAllForClientPaging(category?: string): Observable<ProductDto[]> {
  let params = new HttpParams();
  if (category) params = params.set('category', category);

  return this.http.get<ProductDto[]>(`${this.baseUrl}/all`, { params });
}
```

```typescript
// src/app/components/product-client-paged/product-client-paged.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductService } from '../../services/product.service';
import { ProductDto } from '../../models/product.models';

@Component({
  selector: 'app-product-client-paged',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngFor="let p of pagedItems">{{ p.name }} — {{ p.price | currency }}</div>
    <button [disabled]="page <= 1" (click)="goTo(page - 1)">Previous</button>
    <span>Page {{ page }} of {{ totalPages }}</span>
    <button [disabled]="page >= totalPages" (click)="goTo(page + 1)">Next</button>
  `
})
export class ProductClientPagedComponent implements OnInit {
  private productService = inject(ProductService);

  allItems: ProductDto[] = [];
  page = 1;
  pageSize = 20;

  get pagedItems(): ProductDto[] {
    const start = (this.page - 1) * this.pageSize;
    return this.allItems.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.allItems.length / this.pageSize) || 1;
  }

  ngOnInit(): void {
    this.productService.getAllForClientPaging().subscribe(items => this.allItems = items);
  }

  goTo(page: number): void {
    this.page = page;
  }
}
```

## 36. Guardrails

- Always cap the server response (`hardCap` above) — never trust "it's a
  small table today" to stay true.
- If the dataset can grow unbounded, this isn't the right approach — fall
  back to Approach 1 or 2.
- One HTTP call total, regardless of how many pages the user clicks through
  — that's the entire point, and also the entire risk if the dataset grows.

---

# Wrap-up

## 37. Specification pattern (bonus, mention if time allows) — (Application/Specifications/)

```csharp
using System.Linq.Expressions;

public interface ISpecification<T>
{
    Expression<Func<T, bool>> ToExpression();
}

public class ProductByCategorySpecification : ISpecification<Product>
{
    private readonly string? _category;

    public ProductByCategorySpecification(string? category) => _category = category;

    public Expression<Func<Product, bool>> ToExpression()
    {
        return string.IsNullOrWhiteSpace(_category)
            ? (p => p.IsActive)
            : (p => p.IsActive && p.Category == _category);
    }
}
// usage: query = query.Where(spec.ToExpression());
```

Not tied to a single approach — it's a way to compose filters (like
`category`) without touching the repository each time a new filter is
needed. Applies equally to offset, cursor, time-based or client-side
queries.

---

# SOLID — one line each, memorize these

- **S**ingle Responsibility: Controller = HTTP only, Service = business logic, Repository = data access, CursorCodec/TimeCursorCodec = encode/decode only.
- **O**pen/Closed: Specification pattern lets you add new filters without touching the repository.
- **L**iskov Substitution: `ProductRepository` can be used anywhere `IGenericRepository<Product>` is expected.
- **I**nterface Segregation: `IProductRepository` adds only product-specific methods on top of a lean generic interface.
- **D**ependency Inversion: `ProductService` depends on `IUnitOfWork` (interface), not `UnitOfWork` or `AppDbContext` directly.

---

# Pagination approach comparison — offset vs cursor vs time-based vs client-side

| Approach | Cursor/param | Best for | Downside |
|---|---|---|---|
| **1. Offset** | `page` + `pageSize` | Admin grids, reports, need total count / page numbers | Slower at deep pages; page drift on writes |
| **2. Cursor (keyset)** | opaque `Id`-based cursor | Infinite scroll, large/high-write tables | No page numbers, no total count |
| **3. Time-based cursor** | timestamp (+ tie-break `Id`) cursor | Feeds, logs, "what's new since X" | Requires a reliable, indexed timestamp column |
| **4. Client-side** | none — fetch once | Small static/reference lists | Doesn't scale; one call returns everything |

> "Offset pagination for admin/reporting UIs that need page numbers and
> total counts on modest datasets. Cursor/keyset pagination for
> infinite-scroll or large, high-write tables, since it avoids page drift
> and stays fast at any depth. Time-based cursor is the same mechanism as
> keyset, but sorted by timestamp instead of Id, for feed-style 'since last
> check' use cases. Client-side paging isn't really pagination from the
> API's perspective — it's a UI-only slice of a single, capped response,
> and only makes sense for small datasets."

Mandatory requirement for cursor/time-based pagination: the `ORDER BY`
column(s) **must be unique and indexed**, otherwise rows can be skipped or
duplicated when two rows tie on the sort key.

---

# What to actually write in 60 minutes, no IDE

Don't attempt all 4 approaches in full. In priority order:

1. **Say all four approaches exist, out loud**, before writing anything (30 sec) — see the comparison table above for the one-liners.
2. Write the **offset params + result classes** (section 12) — signals you won't return a bare `List<T>` from an API.
3. Write **one controller action with inline logic** (merge Approach 1's repository + controller into a single method) rather than insisting on full layering:

```csharp
[HttpGet]
public async Task<ActionResult<PagedResult<ProductDto>>> Get(int page = 1, int pageSize = 20)
{
    if (page < 1) page = 1;
    if (pageSize < 1 || pageSize > 100) pageSize = 20;

    var query = _db.Products.AsNoTracking().Where(p => p.IsActive);
    var total = await query.CountAsync();
    var items = await query.OrderBy(p => p.Id)
                            .Skip((page - 1) * pageSize)
                            .Take(pageSize)
                            .ToListAsync();

    return Ok(new PagedResult<ProductDto>
    {
        Items = items.Select(p => new ProductDto { Id = p.Id, Name = p.Name, Price = p.Price }).ToList(),
        Page = page, PageSize = pageSize, TotalCount = total
    });
}
```

4. Narrate: *"In a real project I'd split this into Controller → Service →
   Repository → UnitOfWork, with the repository behind an interface for
   testability — here's roughly how the layers would look..."* and sketch
   method signatures only, not full bodies, for the rest.
5. Always mention: **cap pageSize**, **validate page ≥ 1**, **index the sort
   column**, **AsNoTracking() for read-only queries**.
6. If they push for cursor pagination specifically, write section 20's
   cursor method directly — it's short enough to write in full even under
   time pressure.
7. If they ask "what other approaches exist" — that's when you mention
   time-based cursor and client-side paging **verbally**, using the
   comparison table's one-liners. Don't start typing them unless explicitly
   asked to implement one.

Good luck tomorrow.

---

# Anticipated Follow-Up Questions (with Answers)

Once you've walked through the code, expect the interviewer to probe *why*
you made each choice, not just whether it works. These are grouped by which
part of the submission would trigger them.

### Architecture & design patterns

**Q: Why Clean Architecture / layered design at all — why not one controller with EF calls inline?**
A: It separates *what the business does* (Domain/Application) from *how it's
persisted/exposed* (Infrastructure/API). That lets you swap EF Core for
Dapper, or REST for gRPC, without touching business logic. For a demo-sized
app it's genuinely more ceremony than the problem needs in isolation — the
payoff is long-term change safety and testability as the app grows, not
speed of writing this exact feature.

**Q: Why Repository pattern on top of EF Core, when `DbContext` is already an abstraction?**
A: `DbContext` abstracts ADO.NET; the Repository abstracts persistence for
*my application*. It hides EF Core specifics (`IQueryable`, change tracking,
LINQ provider quirks) behind a domain-shaped interface, so `ProductService`
only knows "get me a page of products," not "how EF Core executes that." It
also makes services unit-testable without a real database.

**Q: Why Unit of Work when `DbContext` already tracks changes and commits atomically?**
A: It decouples the service layer from EF Core (Dependency Inversion — the
service depends on `IUnitOfWork`, not `AppDbContext`) and gives one place to
coordinate a save across multiple repositories if the app grows beyond a
single entity. Honest caveat: on a pure EF Core stack it's somewhat
redundant, since `DbContext` already *is* a unit of work — it earns its
keep mainly through testability and insulating the app from an ORM swap.

**Q: Generic `IGenericRepository<T>` plus a specific `IProductRepository` — isn't that an ISP violation?**
A: No — Interface Segregation is about not forcing *unrelated* consumers to
depend on methods they don't use. `IProductRepository` extending the
generic interface is just composition: its consumers get both the generic
CRUD and the product-specific pagination methods, and nothing forces an
unrelated repository's consumers to see Product-specific methods.

**Q: Why DTOs instead of returning entities directly from the API?**
A: Decouples the wire contract from the persistence model — the DTO can
omit internal fields (`IsActive`) and evolve independently of schema
changes. It also avoids accidentally serializing EF navigation
properties/lazy-loading proxies into the response.

**Q: Why the Specification pattern instead of just adding filter parameters?**
A: Open/Closed — new filters become new `Specification` classes without
touching the repository's method signature every time. At this scale (one
`category` filter) it's arguably overkill; it pays off once you have many
optional, combinable filters.

**Q: Walk me through each SOLID letter with a concrete example from your code.**
A: Use the doc's SOLID section verbatim as your answer skeleton — Controller
vs Service vs Repository vs Codec (**S**), Specification pattern (**O**),
`ProductRepository` substitutable for `IGenericRepository<Product>` (**L**),
`IProductRepository`'s lean surface (**I**), `ProductService` depending on
`IUnitOfWork` not `AppDbContext` (**D**).

### Pagination trade-offs

**Q: Why implement 4 approaches instead of picking one?**
A: Different UIs and access patterns need different guarantees:
page-numbered grids need offset (total count, jump-to-page); infinite
scroll needs cursor (no drift, fast at any depth); feeds need time-based
cursor ("what's new since X"); small static lists don't need server-side
paging at all. Showing all four demonstrates picking the tool for the
access pattern instead of defaulting to one everywhere.

**Q: Explain offset vs cursor precisely — mechanism, not just "one is faster."**
A: Offset counts and discards N rows positionally (`Skip`/`Take` →
`OFFSET`/`FETCH`); cursor seeks directly to a row's identity
(`WHERE Id > lastId`) using the index, never touching the skipped rows at
all. That's why cursor's cost stays flat at any depth and offset's grows
with page number.

**Q: What is "page drift," and how does cursor pagination avoid it?**
A: If rows are inserted or deleted between two offset requests, the
positional ranking shifts — a row can be skipped entirely or shown twice,
because `Skip(N)` is a *position*, not a fixed identity. Cursor pagination
anchors to an actual row's `Id` (`WHERE Id > 143`), which stays correct
regardless of what changed elsewhere in the table.

**Q: Why must the cursor's sort column be unique and indexed?**
A: Ties on the sort key make seeking ambiguous — two rows with the same
value could be split inconsistently across pages, causing skipped or
duplicated rows. Uniqueness guarantees a stable, unambiguous order; the
index is what keeps the seek fast instead of degrading into a scan.

**Q: Why base64-encode the cursor instead of sending the raw `Id`? Is that actually secure?**
A: It obscures, it doesn't cryptographically protect — a motivated client
can trivially decode it. The real value is decoupling the API contract (an
opaque token) from the implementation (currently an `Id`) so the
implementation can change later without breaking existing clients. For
genuine tamper-resistance I'd HMAC-sign or encrypt the cursor instead of
just base64-encoding it.

**Q: What happens if a client sends a tampered or garbage cursor?**
A: `CursorCodec.Decode` wraps the base64 decode in a `try/catch` — invalid
input returns `null`, which the repository treats as "no cursor" and
starts from the beginning. It fails safe, not with a crash or a 500.

**Q: Time-based cursor — what if two rows share the exact same `CreatedAt`?**
A: The tie-breaker `Id` in the composite `(CreatedAt, Id)` ordering and
cursor keeps the ordering total and unambiguous even when timestamps
collide — same reasoning as why the offset/cursor sort column must be
unique.

**Q: What about clock skew, or a transaction committing "late" with an earlier timestamp than rows already served?**
A: That row can genuinely be missed — the client's cursor has already moved
past that timestamp window by the time the late write lands. Mitigation:
use a monotonic, strictly-increasing sequence (like an identity `Id`)
instead of wall-clock time when write-ordering correctness matters, or
accept a small deliberate "grace window" and re-query slightly behind the
current time.

**Q: Client-side pagination caps at 500 — how would you actually decide that number for a real dataset?**
A: Based on measured payload size against a reasonable HTTP response budget
(low hundreds of KB to a few MB), how static/small the dataset genuinely
is, and worst-case render cost on lower-powered client devices — profiled,
not guessed.

**Q: Dataset grows from 10K to 50M rows overnight — which approach breaks first?**
A: Client-side breaks immediately (already returning "everything" in one
capped response, now truncating far more of the data). Offset degrades next
as pages get deep — `OFFSET` cost grows with page depth. Cursor keeps
working essentially unchanged, since it's always an index seek regardless
of table size.

**Q: Could you combine approaches — offset for shallow pages, cursor once deep?**
A: Possible, but it adds real complexity: the client needs to know when to
switch, and "page number" UX doesn't translate cleanly into cursor
semantics. Usually not worth it in practice — better to just pick cursor
up front for anything that could scale.

**Q: Cursor pagination has no `TotalCount` — is that a real problem for infinite scroll?**
A: Not really — infinite scroll UX needs "keep loading until `hasMore` is
false," not "37 of 4,200 items." `TotalCount` matters for offset's
page-number UI; it's not a natural fit for a continuously-scrolling feed
anyway.

**Q: How does this relate to GraphQL's Relay cursor spec or cloud provider continuation tokens (DynamoDB, Cosmos)?**
A: Same concept, different vendor name — Relay's `cursor`/`after`,
DynamoDB's `LastEvaluatedKey`, Cosmos's `ContinuationToken`, S3's
`ContinuationToken` are all opaque tokens the client stores and replays
verbatim to resume a seek-based scan. This doc's `cursor` is a simplified,
self-contained version of the same pattern.

### EF Core / data layer

**Q: Why `AsNoTracking()` on every read query — what does it actually save, and when would you skip it?**
A: It skips the change tracker's overhead (snapshotting, dirty-checking) for
queries that only read — meaningful on larger result sets. Skip it when you
intend to modify and `SaveChanges()` the same entities you just queried
(a get-then-update flow), since that requires tracking.

**Q: Does `Skip`/`Take` translate the same way on every database provider?**
A: The LINQ is identical; the generated SQL isn't — SQL Server gets
`OFFSET`/`FETCH NEXT`, MySQL/SQLite get `LIMIT`/`OFFSET` syntax. That's the
point of the abstraction: same C#, provider-appropriate SQL.

**Q: Why index `Category` and put a unique index on `Id`?**
A: Without them, filtering by category or sorting/seeking by `Id` forces a
full table scan. The `Category` index supports the `WHERE p.Category ==
category` filter; the unique `Id` index (really the PK) supports the
`ORDER BY`/seek every pagination approach relies on.

**Q: Why a composite index on `(CreatedAt, Id)` for time-based pagination instead of two separate indexes?**
A: A composite index lets the seek `WHERE CreatedAt > x OR (CreatedAt = x
AND Id > y) ORDER BY CreatedAt, Id` execute as a single ordered index seek.
Two separate single-column indexes can't be combined that efficiently for
this compound sort-and-seek pattern.

**Q: Why `decimal(18,2)` for `Price` instead of `float`/`double`?**
A: `decimal` is exact base-10 arithmetic — required for money, since
`float`/`double` are approximate binary floating point and can produce
rounding errors (`0.1 + 0.2 != 0.3` in binary) that are unacceptable for
financial values.

**Q: Why `Take(limit + 1)` instead of a separate existence check?**
A: It's a single query (`SELECT TOP 21 ...`) instead of two round-trips.
Fetching one extra row and trimming it client-side is cheaper than a
follow-up `AnyAsync()` call.

**Q: Soft delete (`IsActive`) vs hard delete — does it matter for cursor stability?**
A: Soft delete leaves the `Id` sequence and row intact, so a cursor
pointing past that `Id` stays valid — the row is just filtered out by the
`IsActive` check. Hard delete leaves a gap in `Id`s, which is also harmless
for cursor pagination (`Id > lastId` still works fine); the real danger
would be *reusing* `Id`s, which identity columns never do by design.

### API / REST design

**Q: Why query params for `page`/`pageSize` instead of a request body?**
A: GET requests conventionally carry no body (and many caches/proxies strip
it). Query params keep the request cacheable, bookmarkable, and RESTful — a
GET should be fully described by its URL.

**Q: Why `/cursor` and `/since` as separate routes instead of one endpoint with a `?strategy=` flag?**
A: Each style returns a different response shape (`PagedResult` vs
`CursorPagedResult` vs `TimeCursorPagedResult`) and takes different query
params. Modeling them as distinct routes keeps each endpoint's contract
explicit and self-documenting in Swagger, rather than one endpoint whose
shape depends on a hidden flag.

**Q: Would you version this API?**
A: Yes, if the pagination contract changed in a breaking way (e.g. renaming
`NextCursor`) — via URL versioning (`/api/v2/products`) or a header. For
additive changes (a new optional field) I wouldn't version, just extend.

**Q: Should the response include HATEOAS-style `self`/`next`/`prev` links?**
A: Could, for a more RESTful (Richardson Maturity Model level 3) API — but
for an API consumed by a single SPA that already knows how to build the
next request from `NextCursor`, it's often unnecessary ceremony. Worth
adding if the API were meant for third-party/public consumption.

**Q: Why is `Category` a free-text filter instead of a foreign key to a `Categories` table?**
A: Free text is simpler and fine for a small, stable category set with low
miskey risk. A FK normalizes it, prevents typos/inconsistent casing, and
supports richer category metadata — worth doing once categories need their
own attributes or change often.

**Q: `PageSize` is clamped in its setter — is that the right layer? What about `page=0` or negative?**
A: Clamping in the setter is defensive but silent — a client sending
`pageSize=500` gets quietly capped to 100 with no feedback. I'd pair it
with model validation (`[Range]` + an explicit 400 response) for clearer
client-facing errors, and add the same clamp/validation to `Page` — it's
currently unguarded, so `Skip((page - 1) * pageSize)` throws on `page=0` or
a negative value. (This is a real bug spotted earlier in this exact doc —
know the fix cold.)

### Security

**Q: Can a client forge a page number to see data beyond intended limits?**
A: Not in this app, since pagination isn't layered onto any per-user
scoping — but in general, if pagination sat on top of a permission-scoped
list (e.g. "my orders"), the authorization filter (`UserId ==
currentUser`) must always be applied alongside the pagination filter, never
relied on to keep users in a lane by itself.

**Q: SQL injection risk via the `category` filter?**
A: Not exploitable — `.Where(p => p.Category == category)` is translated by
EF Core into a parameterized SQL query, the same protection ADO.NET's
`SqlParameter` gives you. The string is never concatenated into raw SQL
text.

**Q: Should these endpoints require authentication?**
A: Depends on data sensitivity — this demo doesn't show auth, but any
real endpoint returning non-public data should have `[Authorize]`, and if
categories are user/tenant-scoped, the server should filter by the
authenticated user's tenant regardless of what the client requests.

**Q: Could cursor pagination make it easy to scrape the entire dataset?**
A: Yes — looping cursor requests is a cheap, complete crawl of the table.
I'd add rate limiting (e.g. ASP.NET Core's built-in `RateLimiter`
middleware) per client/IP/API key on these endpoints in production.

### Performance & scalability

**Q: How does statelessness help horizontal scaling, and what would break it?**
A: Every request carries everything needed to resume (a page number or
cursor), so any server instance behind a load balancer can serve any
request — no sticky sessions required. It would break if the cursor or
"current page" were cached server-side keyed by session instead of being
round-tripped to the client on every request.

**Q: Would you cache the `CountAsync()` call for offset pagination?**
A: Yes — it reruns on every single page request even though the total
rarely changes mid-session. A short-TTL cache per category filter trades a
little staleness for a large reduction in `COUNT(*)` query volume.

**Q: At what offset does deep paging become a real problem?**
A: Rough ballpark: noticeable degradation starts somewhere in the
tens-of-thousands to low hundreds-of-thousands of skipped rows, depending
on indexing and hardware. The exact number needs profiling on real data —
the important thing to know is the trend (cost grows with page depth), not
a memorized figure.

**Q: What about concurrent writes during a long offset-paging session?**
A: Same page-drift issue, framed as a testable scenario — write an
integration test that inserts a row mid-pagination and asserts on whether
the resulting pages skip or duplicate rows.

### Angular / frontend

**Q: Why standalone components instead of NgModules?**
A: It's the modern Angular default — no NgModule boilerplate, components
declare their own imports directly, better tree-shaking, and it's the
direction Angular is heading; NgModules are increasingly legacy.

**Q: Why polling instead of SignalR/WebSockets for the live-feed component?**
A: Polling is simpler and stateless — no persistent connection, no
server-push infrastructure, works through any proxy/firewall a normal HTTP
GET does. The trade-off is latency (bounded by the poll interval) and
wasted requests when nothing's new. I'd switch to SignalR/WebSockets if
true real-time delivery mattered, or if polling volume itself became a load
problem.

**Q: Why is error handling omitted in the `.subscribe()` calls?**
A: Kept out only to keep the reference snippets interview-length. In
production I'd add an error callback (or `catchError` in the service) so a
failed request surfaces to the user instead of leaving the UI silently
stuck on stale data.

**Q: Why keep `apiBaseUrl` in `environment.ts`?**
A: Keeps environment-specific config (dev/staging/prod API host) out of
component code, swappable at build time via Angular's file-replacement
mechanism without touching any TypeScript logic.

**Q: The offset component replaces `items`, the cursor component appends to it — could that get flipped by accident?**
A: Easily, if copy-pasted between the two without noticing — it's a
one-line, one-character difference (`this.items = result.items` vs
`this.items = [...this.items, ...result.items]`) that encodes the entire
UX difference between "paged grid" and "infinite scroll." Worth flagging
specifically in code review since the bug is easy to introduce and easy to
miss.

### Testing

**Q: How would you unit test `ProductService.GetOffsetPagedAsync` without a real database?**
A: Mock `IUnitOfWork` (with its `Products` property returning a mocked
`IProductRepository`) using Moq/NSubstitute, stub
`GetOffsetPagedAsync` to return a known `(items, totalCount)` tuple, then
assert the service maps and computes `PagedResult` correctly. This is
exactly why the service depends on the interface, not `AppDbContext`
directly.

**Q: How would you test `CursorCodec.Decode` against tampered input?**
A: Feed it non-base64 strings, base64 of non-numeric content, and
empty/null input — assert it returns `null` in every case instead of
throwing, since the repository relies on that "fails safe" contract.

**Q: In-memory EF Core provider or a real test database for integration tests?**
A: In-memory is fast but doesn't enforce real SQL Server behavior (it won't
catch a missing index or validate that `Skip`/`OrderBy` actually translate
correctly). For pagination specifically I'd lean toward a real, containerized
database (e.g. Testcontainers) for repository-level tests, and reserve
in-memory for pure service-layer logic tests.
