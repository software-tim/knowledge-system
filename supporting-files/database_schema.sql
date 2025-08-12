-- database/schema.sql
-- Knowledge Base Database Schema for Azure SQL Database

-- Create the main documents table
CREATE TABLE documents (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    title NVARCHAR(500) NOT NULL,
    content NTEXT,
    classification NVARCHAR(100),
    entities NTEXT, -- JSON string of extracted entities
    metadata NTEXT, -- JSON string of additional metadata
    file_data VARBINARY(MAX), -- Original file data
    file_name NVARCHAR(255),
    file_type NVARCHAR(100),
    file_size BIGINT,
    created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    updated_at DATETIME2,
    indexed_at DATETIME2, -- When document was indexed for search
    is_active BIT NOT NULL DEFAULT 1,
    
    -- Full-text search support
    CONSTRAINT [PK_documents] PRIMARY KEY CLUSTERED ([id])
);

-- Create index for common queries
CREATE NONCLUSTERED INDEX [IX_documents_created_at] ON documents ([created_at] DESC);
CREATE NONCLUSTERED INDEX [IX_documents_classification] ON documents ([classification]);
CREATE NONCLUSTERED INDEX [IX_documents_is_active] ON documents ([is_active]);

-- Enable full-text search on content
CREATE FULLTEXT CATALOG [knowledge_base_catalog];
CREATE FULLTEXT INDEX ON documents(title, content) 
KEY INDEX [PK_documents] ON [knowledge_base_catalog];

-- Create entities table for structured entity storage
CREATE TABLE entities (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(255) NOT NULL,
    type NVARCHAR(100) NOT NULL, -- PERSON, ORGANIZATION, LOCATION, etc.
    description NTEXT,
    properties NTEXT, -- JSON string of additional properties
    confidence DECIMAL(3,2), -- Confidence score 0.00-1.00
    created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    
    CONSTRAINT [UK_entities_name_type] UNIQUE ([name], [type])
);

CREATE NONCLUSTERED INDEX [IX_entities_type] ON entities ([type]);
CREATE NONCLUSTERED INDEX [IX_entities_name] ON entities ([name]);

-- Create document-entity relationships
CREATE TABLE document_entities (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    document_id BIGINT NOT NULL,
    entity_id BIGINT NOT NULL,
    relevance_score DECIMAL(3,2), -- How relevant is this entity to the document
    context NVARCHAR(1000), -- Context where entity was found
    created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    
    CONSTRAINT [FK_document_entities_document] FOREIGN KEY ([document_id]) REFERENCES documents([id]) ON DELETE CASCADE,
    CONSTRAINT [FK_document_entities_entity] FOREIGN KEY ([entity_id]) REFERENCES entities([id]) ON DELETE CASCADE,
    CONSTRAINT [UK_document_entities] UNIQUE ([document_id], [entity_id])
);

-- Create entity relationships table (knowledge graph)
CREATE TABLE entity_relationships (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    source_entity_id BIGINT NOT NULL,
    target_entity_id BIGINT NOT NULL,
    relationship_type NVARCHAR(100) NOT NULL, -- WORKS_AT, LOCATED_IN, PART_OF, etc.
    confidence DECIMAL(3,2), -- Confidence score 0.00-1.00
    evidence NTEXT, -- Text evidence supporting this relationship
    document_source_id BIGINT, -- Document where this relationship was discovered
    created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    
    CONSTRAINT [FK_entity_relationships_source] FOREIGN KEY ([source_entity_id]) REFERENCES entities([id]) ON DELETE CASCADE,
    CONSTRAINT [FK_entity_relationships_target] FOREIGN KEY ([target_entity_id]) REFERENCES entities([id]),
    CONSTRAINT [FK_entity_relationships_document] FOREIGN KEY ([document_source_id]) REFERENCES documents([id]),
    CONSTRAINT [UK_entity_relationships] UNIQUE ([source_entity_id], [target_entity_id], [relationship_type])
);

CREATE NONCLUSTERED INDEX [IX_entity_relationships_source] ON entity_relationships ([source_entity_id]);
CREATE NONCLUSTERED INDEX [IX_entity_relationships_target] ON entity_relationships ([target_entity_id]);
CREATE NONCLUSTERED INDEX [IX_entity_relationships_type] ON entity_relationships ([relationship_type]);

-- Create classifications table
CREATE TABLE classifications (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(100) NOT NULL UNIQUE,
    description NVARCHAR(500),
    parent_classification_id INT NULL,
    is_active BIT NOT NULL DEFAULT 1,
    created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    
    CONSTRAINT [FK_classifications_parent] FOREIGN KEY ([parent_classification_id]) REFERENCES classifications([id])
);

-- Create search history table
CREATE TABLE search_history (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    query NVARCHAR(1000) NOT NULL,
    search_type NVARCHAR(50) NOT NULL, -- semantic, keyword, vector
    filters NTEXT, -- JSON string of applied filters
    results_count INT,
    processing_time_ms INT,
    user_session NVARCHAR(100), -- For tracking user sessions
    created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

CREATE NONCLUSTERED INDEX [IX_search_history_created_at] ON search_history ([created_at] DESC);
CREATE NONCLUSTERED INDEX [IX_search_history_query] ON search_history ([query]);

-- Create workflow executions table
CREATE TABLE workflow_executions (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    workflow_id NVARCHAR(100) NOT NULL UNIQUE,
    workflow_type NVARCHAR(100) NOT NULL, -- document_processing, batch_processing, etc.
    status NVARCHAR(50) NOT NULL, -- completed, failed, completed_with_errors
    input_data NTEXT, -- JSON string of input parameters
    output_data NTEXT, -- JSON string of results
    processing_time_ms BIGINT,
    error_message NTEXT,
    created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    completed_at DATETIME2
);

CREATE NONCLUSTERED INDEX [IX_workflow_executions_created_at] ON workflow_executions ([created_at] DESC);
CREATE NONCLUSTERED INDEX [IX_workflow_executions_type] ON workflow_executions ([workflow_type]);
CREATE NONCLUSTERED INDEX [IX_workflow_executions_status] ON workflow_executions ([status]);

-- Create system metrics table
CREATE TABLE system_metrics (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    metric_name NVARCHAR(100) NOT NULL,
    metric_value DECIMAL(18,6),
    metric_text NVARCHAR(500),
    service_name NVARCHAR(100), -- phi4, sql, graphrag, search, orchestrator
    recorded_at DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

CREATE NONCLUSTERED INDEX [IX_system_metrics_recorded_at] ON system_metrics ([recorded_at] DESC);
CREATE NONCLUSTERED INDEX [IX_system_metrics_service] ON system_metrics ([service_name]);

-- Create views for common queries

-- Document summary view
CREATE VIEW vw_document_summary AS
SELECT 
    d.id,
    d.title,
    d.classification,
    d.file_name,
    d.file_type,
    d.file_size,
    d.created_at,
    d.updated_at,
    COUNT(de.entity_id) as entity_count,
    STRING_AGG(CAST(e.name AS NVARCHAR(MAX)), ', ') as entity_names
FROM documents d
LEFT JOIN document_entities de ON d.id = de.document_id
LEFT JOIN entities e ON de.entity_id = e.id
WHERE d.is_active = 1
GROUP BY d.id, d.title, d.classification, d.file_name, d.file_type, d.file_size, d.created_at, d.updated_at;

-- Entity relationship view
CREATE VIEW vw_entity_relationships AS
SELECT 
    er.id,
    se.name as source_entity,
    se.type as source_type,
    er.relationship_type,
    te.name as target_entity,
    te.type as target_type,
    er.confidence,
    d.title as source_document,
    er.created_at
FROM entity_relationships er
JOIN entities se ON er.source_entity_id = se.id
JOIN entities te ON er.target_entity_id = te.id
LEFT JOIN documents d ON er.document_source_id = d.id;

-- Popular search terms view
CREATE VIEW vw_popular_searches AS
SELECT 
    query,
    COUNT(*) as search_count,
    AVG(CAST(processing_time_ms AS FLOAT)) as avg_processing_time,
    MAX(created_at) as last_searched
FROM search_history
WHERE created_at >= DATEADD(day, -30, GETUTCDATE())
GROUP BY query
HAVING COUNT(*) > 1;

-- Create stored procedures

-- Procedure to get document with full context
CREATE PROCEDURE sp_GetDocumentWithContext
    @DocumentId BIGINT,
    @IncludeRelatedDocs BIT = 0
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Get main document
    SELECT 
        d.*,
        COUNT(de.entity_id) as entity_count
    FROM documents d
    LEFT JOIN document_entities de ON d.id = de.document_id
    WHERE d.id = @DocumentId AND d.is_active = 1
    GROUP BY d.id, d.title, d.content, d.classification, d.entities, d.metadata, 
             d.file_data, d.file_name, d.file_type, d.file_size, d.created_at, 
             d.updated_at, d.indexed_at, d.is_active;
    
    -- Get entities for this document
    SELECT 
        e.id,
        e.name,
        e.type,
        e.description,
        e.confidence,
        de.relevance_score,
        de.context
    FROM entities e
    JOIN document_entities de ON e.id = de.entity_id
    WHERE de.document_id = @DocumentId
    ORDER BY de.relevance_score DESC;
    
    -- Get entity relationships
    SELECT 
        er.relationship_type,
        se.name as source_entity,
        se.type as source_type,
        te.name as target_entity,
        te.type as target_type,
        er.confidence
    FROM entity_relationships er
    JOIN entities se ON er.source_entity_id = se.id
    JOIN entities te ON er.target_entity_id = te.id
    WHERE er.document_source_id = @DocumentId;
    
    -- Get related documents if requested
    IF @IncludeRelatedDocs = 1
    BEGIN
        SELECT TOP 10
            d2.id,
            d2.title,
            d2.classification,
            COUNT(de2.entity_id) as shared_entities,
            d2.created_at
        FROM documents d2
        JOIN document_entities de2 ON d2.id = de2.document_id
        WHERE de2.entity_id IN (
            SELECT de.entity_id 
            FROM document_entities de 
            WHERE de.document_id = @DocumentId
        )
        AND d2.id != @DocumentId
        AND d2.is_active = 1
        GROUP BY d2.id, d2.title, d2.classification, d2.created_at
        ORDER BY COUNT(de2.entity_id) DESC, d2.created_at DESC;
    END
END;

-- Procedure to search documents with ranking
CREATE PROCEDURE sp_SearchDocuments
    @Query NVARCHAR(1000),
    @Classification NVARCHAR(100) = NULL,
    @EntityType NVARCHAR(100) = NULL,
    @Limit INT = 10,
    @Offset INT = 0
AS
BEGIN
    SET NOCOUNT ON;
    
    WITH SearchResults AS (
        SELECT 
            d.id,
            d.title,
            d.content,
            d.classification,
            d.file_name,
            d.file_type,
            d.created_at,
            -- Calculate relevance score
            (
                CASE 
                    WHEN d.title LIKE '%' + @Query + '%' THEN 5
                    ELSE 0
                END +
                CASE 
                    WHEN d.content LIKE '%' + @Query + '%' THEN 3
                    ELSE 0
                END +
                CASE 
                    WHEN d.classification LIKE '%' + @Query + '%' THEN 2
                    ELSE 0
                END
            ) as relevance_score,
            ROW_NUMBER() OVER (ORDER BY 
                (
                    CASE 
                        WHEN d.title LIKE '%' + @Query + '%' THEN 5
                        ELSE 0
                    END +
                    CASE 
                        WHEN d.content LIKE '%' + @Query + '%' THEN 3
                        ELSE 0
                    END +
                    CASE 
                        WHEN d.classification LIKE '%' + @Query + '%' THEN 2
                        ELSE 0
                    END
                ) DESC,
                d.created_at DESC
            ) as row_num
        FROM documents d
        WHERE d.is_active = 1
        AND (
            d.title LIKE '%' + @Query + '%'
            OR d.content LIKE '%' + @Query + '%'
            OR d.classification LIKE '%' + @Query + '%'
            OR EXISTS (
                SELECT 1 FROM document_entities de
                JOIN entities e ON de.entity_id = e.id
                WHERE de.document_id = d.id
                AND e.name LIKE '%' + @Query + '%'
            )
        )
        AND (@Classification IS NULL OR d.classification = @Classification)
        AND (@EntityType IS NULL OR EXISTS (
            SELECT 1 FROM document_entities de
            JOIN entities e ON de.entity_id = e.id
            WHERE de.document_id = d.id
            AND e.type = @EntityType
        ))
    )
    SELECT 
        id,
        title,
        LEFT(content, 500) + '...' as content_preview,
        classification,
        file_name,
        file_type,
        created_at,
        relevance_score
    FROM SearchResults
    WHERE row_num BETWEEN @Offset + 1 AND @Offset + @Limit
    ORDER BY relevance_score DESC, created_at DESC;
    
    -- Return total count
    SELECT COUNT(*) as total_count
    FROM documents d
    WHERE d.is_active = 1
    AND (
        d.title LIKE '%' + @Query + '%'
        OR d.content LIKE '%' + @Query + '%'
        OR d.classification LIKE '%' + @Query + '%'
        OR EXISTS (
            SELECT 1 FROM document_entities de
            JOIN entities e ON de.entity_id = e.id
            WHERE de.document_id = d.id
            AND e.name LIKE '%' + @Query + '%'
        )
    )
    AND (@Classification IS NULL OR d.classification = @Classification)
    AND (@EntityType IS NULL OR EXISTS (
        SELECT 1 FROM document_entities de
        JOIN entities e ON de.entity_id = e.id
        WHERE de.document_id = d.id
        AND e.type = @EntityType
    ));
END;

-- Procedure to get knowledge graph data
CREATE PROCEDURE sp_GetKnowledgeGraph
    @DocumentId BIGINT = NULL,
    @EntityType NVARCHAR(100) = NULL,
    @Depth INT = 1
AS
BEGIN
    SET NOCOUNT ON;
    
    WITH EntityGraph AS (
        -- Level 0: Start with entities from specific document or all entities
        SELECT 
            e.id,
            e.name,
            e.type,
            e.description,
            0 as level,
            CAST(e.id AS NVARCHAR(MAX)) as path
        FROM entities e
        WHERE (@DocumentId IS NULL OR EXISTS (
            SELECT 1 FROM document_entities de 
            WHERE de.entity_id = e.id AND de.document_id = @DocumentId
        ))
        AND (@EntityType IS NULL OR e.type = @EntityType)
        
        UNION ALL
        
        -- Recursive: Get connected entities up to specified depth
        SELECT 
            e.id,
            e.name,
            e.type,
            e.description,
            eg.level + 1,
            eg.path + ',' + CAST(e.id AS NVARCHAR(MAX))
        FROM EntityGraph eg
        JOIN entity_relationships er ON eg.id = er.source_entity_id
        JOIN entities e ON er.target_entity_id = e.id
        WHERE eg.level < @Depth
        AND CHARINDEX(',' + CAST(e.id AS NVARCHAR(MAX)) + ',', ',' + eg.path + ',') = 0 -- Prevent cycles
    )
    
    -- Return entities
    SELECT DISTINCT
        id,
        name,
        type,
        description,
        level
    FROM EntityGraph;
    
    -- Return relationships
    SELECT 
        er.id,
        er.source_entity_id,
        er.target_entity_id,
        er.relationship_type,
        er.confidence,
        se.name as source_name,
        te.name as target_name
    FROM entity_relationships er
    JOIN entities se ON er.source_entity_id = se.id
    JOIN entities te ON er.target_entity_id = te.id
    WHERE er.source_entity_id IN (SELECT DISTINCT id FROM EntityGraph)
    OR er.target_entity_id IN (SELECT DISTINCT id FROM EntityGraph);
END;

-- Create functions

-- Function to calculate document similarity based on shared entities
CREATE FUNCTION fn_CalculateDocumentSimilarity(@DocId1 BIGINT, @DocId2 BIGINT)
RETURNS DECIMAL(3,2)
AS
BEGIN
    DECLARE @SharedEntities INT;
    DECLARE @TotalEntities INT;
    DECLARE @Similarity DECIMAL(3,2);
    
    SELECT @SharedEntities = COUNT(*)
    FROM document_entities de1
    JOIN document_entities de2 ON de1.entity_id = de2.entity_id
    WHERE de1.document_id = @DocId1 AND de2.document_id = @DocId2;
    
    SELECT @TotalEntities = COUNT(DISTINCT de.entity_id)
    FROM document_entities de
    WHERE de.document_id IN (@DocId1, @DocId2);
    
    IF @TotalEntities = 0
        SET @Similarity = 0.0;
    ELSE
        SET @Similarity = CAST(@SharedEntities AS DECIMAL(3,2)) / CAST(@TotalEntities AS DECIMAL(3,2));
    
    RETURN @Similarity;
END;

-- Create triggers

-- Trigger to update the updated_at timestamp
CREATE TRIGGER tr_documents_update_timestamp
ON documents
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    
    UPDATE documents
    SET updated_at = GETUTCDATE()
    FROM documents d
    INNER JOIN inserted i ON d.id = i.id;
END;

-- Trigger to log search queries
CREATE TRIGGER tr_log_search_metrics
ON search_history
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;
    
    INSERT INTO system_metrics (metric_name, metric_value, service_name, recorded_at)
    SELECT 
        'search_query_count',
        1,
        'search',
        GETUTCDATE()
    FROM inserted;
    
    INSERT INTO system_metrics (metric_name, metric_value, service_name, recorded_at)
    SELECT 
        'search_processing_time_ms',
        processing_time_ms,
        'search',
        GETUTCDATE()
    FROM inserted
    WHERE processing_time_ms IS NOT NULL;
END;