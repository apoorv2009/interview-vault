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
// IProductService.cs (skeleton — each approach below adds one method)
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
