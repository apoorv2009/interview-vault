# Pagination API — All Code, One File (Notepad/No-IDE Reference)

This is everything from the layered solution, laid out as ONE file so you can
scroll/study it linearly. In the actual round you obviously won't type all of
this — see the **"What to actually write in 60 minutes"** section at the very
bottom. Each block below is labeled with the folder it *would* live in, in a
real project — just say that out loud ("this would go in my Repository layer")
rather than actually creating folders.

---

## Conceptual folder structure (say this out loud, don't create it)

```
Domain/            → Entities, interfaces, pagination models (no dependencies)
Application/       → Services, DTOs (business logic)
Infrastructure/    → EF Core, repository implementations (data access)
API/                → Controllers, Program.cs (HTTP layer)
```

---

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

## 2. Pagination request/response models — (Domain/Common/PaginationModels.cs)

```csharp
// ---------- OFFSET-BASED ----------
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

// ---------- CURSOR / KEYSET-BASED ----------
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

---

## 3. Repository interfaces — (Domain/Interfaces/)

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

// IProductRepository.cs
public interface IProductRepository : IGenericRepository<Product>
{
    Task<(IReadOnlyList<Product> Items, int TotalCount)> GetOffsetPagedAsync(
        int page, int pageSize, string? category = null);

    Task<(IReadOnlyList<Product> Items, bool HasMore)> GetCursorPagedAsync(
        int? lastId, int limit, string? category = null);
}

// IUnitOfWork.cs
public interface IUnitOfWork : IDisposable
{
    IProductRepository Products { get; }
    Task<int> SaveChangesAsync();
}
```

---

## 4. DTOs — (Application/DTOs/ProductDtos.cs)

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

## 5. Service interface — (Application/Interfaces/IProductService.cs)

```csharp
public interface IProductService
{
    Task<PagedResult<ProductDto>> GetOffsetPagedAsync(PaginationParams paginationParams, string? category);
    Task<CursorPagedResult<ProductDto>> GetCursorPagedAsync(CursorPaginationParams cursorParams, string? category);
    Task<ProductDto> CreateAsync(CreateProductDto dto);
}
```

---

## 6. Cursor encode/decode helper — (Application/Services/CursorCodec.cs)

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

---

## 7. Service implementation — (Application/Services/ProductService.cs)

```csharp
public class ProductService : IProductService
{
    private readonly IUnitOfWork _unitOfWork;

    public ProductService(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

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

---

## 8. Specification pattern (bonus, mention if time allows) — (Application/Specifications/)

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

---

## 9. EF Core DbContext — (Infrastructure/Persistence/AppDbContext.cs)

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

## 10. EF Fluent API config — (Infrastructure/Persistence/Configurations/ProductConfiguration.cs)

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

        // Sort/filter columns must be indexed - mandatory for both pagination styles
        builder.HasIndex(p => p.Category);
        builder.HasIndex(p => p.Id).IsUnique();
    }
}
```

---

## 11. Generic repository implementation — (Infrastructure/Persistence/Repositories/GenericRepository.cs)

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
```

---

## 12. Product repository — both pagination strategies — (Infrastructure/Persistence/Repositories/ProductRepository.cs)

```csharp
using Microsoft.EntityFrameworkCore;

public class ProductRepository : GenericRepository<Product>, IProductRepository
{
    public ProductRepository(AppDbContext context) : base(context) { }

    // ---------- OFFSET-BASED ----------
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

    // ---------- CURSOR / KEYSET-BASED ----------
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
}
```

---

## 13. Unit of Work — (Infrastructure/Persistence/UnitOfWork.cs)

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

## 14. Controller — (API/Controllers/ProductsController.cs)

```csharp
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

    // GET api/products?page=1&pageSize=20&category=Electronics
    [HttpGet]
    public async Task<ActionResult<PagedResult<ProductDto>>> GetOffsetPaged(
        [FromQuery] PaginationParams paginationParams,
        [FromQuery] string? category)
    {
        var result = await _productService.GetOffsetPagedAsync(paginationParams, category);
        return Ok(result);
    }

    // GET api/products/cursor?cursor=xyz&limit=20&category=Electronics
    [HttpGet("cursor")]
    public async Task<ActionResult<CursorPagedResult<ProductDto>>> GetCursorPaged(
        [FromQuery] CursorPaginationParams cursorParams,
        [FromQuery] string? category)
    {
        var result = await _productService.GetCursorPagedAsync(cursorParams, category);
        return Ok(result);
    }

    [HttpPost]
    public async Task<ActionResult<ProductDto>> Create([FromBody] CreateProductDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var created = await _productService.CreateAsync(dto);
        return CreatedAtAction(nameof(GetOffsetPaged), new { id = created.Id }, created);
    }
}
```

---

## 15. DI wiring — (API/Program.cs)

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

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();
app.Run();
```

---

# SOLID — one line each, memorize these

- **S**ingle Responsibility: Controller = HTTP only, Service = business logic, Repository = data access, CursorCodec = encode/decode only.
- **O**pen/Closed: Specification pattern lets you add new filters without touching the repository.
- **L**iskov Substitution: `ProductRepository` can be used anywhere `IGenericRepository<Product>` is expected.
- **I**nterface Segregation: `IProductRepository` adds only product-specific methods on top of a lean generic interface.
- **D**ependency Inversion: `ProductService` depends on `IUnitOfWork` (interface), not `UnitOfWork` or `AppDbContext` directly.

---

# Offset vs Cursor — one-line answer if asked "which do you use?"

> "Offset pagination for admin/reporting UIs that need page numbers and total
> counts on modest datasets. Cursor/keyset pagination for infinite-scroll or
> large, high-write tables, since it avoids page drift and stays fast at any
> depth — no OFFSET means the DB never has to scan and discard skipped rows."

Mandatory requirement for cursor pagination: the `ORDER BY` column **must be
unique and indexed** (Id / PK is the safe default), otherwise rows can be
skipped or duplicated when two rows tie on the sort key.

---

# What to actually write in 60 minutes, no IDE

Don't attempt all 15 blocks above. In priority order:

1. **Say both approaches exist, out loud**, before writing anything (30 sec).
2. Write the **params + result classes** (Block 2) — signals you won't return
   a bare `List<T>` from an API.
3. Write **one controller action with inline logic** (merge Blocks 12 + 14
   into a single method) rather than insisting on full layering:

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
6. If they push for cursor pagination specifically, write Block 12's cursor
   method directly — it's short enough to write in full even under time
   pressure.

Good luck tomorrow.
