-- database/seed-data.sql
-- Seed data for Knowledge Base system

-- Insert default classifications
INSERT INTO classifications (name, description) VALUES
('Technical Documentation', 'API docs, technical guides, system documentation'),
('Research Paper', 'Academic papers, research studies, scientific publications'),
('Business Report', 'Financial reports, market analysis, business intelligence'),
('Meeting Notes', 'Meeting minutes, discussion notes, action items'),
('Policy Document', 'Company policies, procedures, compliance documents'),
('Training Material', 'Educational content, tutorials, training guides'),
('Legal Document', 'Contracts, agreements, legal documentation'),
('Product Specification', 'Product requirements, specifications, feature docs'),
('User Guide', 'End-user documentation, help guides, manuals'),
('Other', 'Miscellaneous documents not fitting other categories');

-- Insert sample entities for testing
INSERT INTO entities (name, type, description, confidence) VALUES
('Artificial Intelligence', 'CONCEPT', 'Field of computer science focused on creating intelligent machines', 0.95),
('Machine Learning', 'CONCEPT', 'Subset of AI that enables computers to learn without explicit programming', 0.95),
('Natural Language Processing', 'CONCEPT', 'AI technology that helps computers understand human language', 0.90),
('Deep Learning', 'CONCEPT', 'Machine learning technique using neural networks', 0.90),
('Microsoft', 'ORGANIZATION', 'Technology corporation', 0.95),
('Azure', 'TECHNOLOGY', 'Microsoft cloud computing platform', 0.95),
('OpenAI', 'ORGANIZATION', 'AI research and deployment company', 0.95),
('GPT', 'TECHNOLOGY', 'Generative Pre-trained Transformer model', 0.90),
('Python', 'TECHNOLOGY', 'Programming language popular in AI/ML', 0.95),
('TensorFlow', 'TECHNOLOGY', 'Open-source machine learning framework', 0.90),
('PyTorch', 'TECHNOLOGY', 'Open-source machine learning library', 0.90),
('Transformer', 'CONCEPT', 'Neural network architecture for NLP tasks', 0.85),
('BERT', 'TECHNOLOGY', 'Bidirectional Encoder Representations from Transformers', 0.85),
('Neural Network', 'CONCEPT', 'Computing system inspired by biological neural networks', 0.90),
('Data Science', 'CONCEPT', 'Field that uses scientific methods to extract insights from data', 0.90);

-- Insert sample entity relationships
INSERT INTO entity_relationships (source_entity_id, target_entity_id, relationship_type, confidence) VALUES
((SELECT id FROM entities WHERE name = 'Machine Learning'), (SELECT id FROM entities WHERE name = 'Artificial Intelligence'), 'SUBSET_OF', 0.95),
((SELECT id FROM entities WHERE name = 'Deep Learning'), (SELECT id FROM entities WHERE name = 'Machine Learning'), 'SUBSET_OF', 0.90),
((SELECT id FROM entities WHERE name = 'Natural Language Processing'), (SELECT id FROM entities WHERE name = 'Artificial Intelligence'), 'SUBSET_OF', 0.90),
((SELECT id FROM entities WHERE name = 'Azure'), (SELECT id FROM entities WHERE name = 'Microsoft'), 'PRODUCT_OF', 0.95),
((SELECT id FROM entities WHERE name = 'GPT'), (SELECT id FROM entities WHERE name = 'OpenAI'), 'DEVELOPED_BY', 0.95),
((SELECT id FROM entities WHERE name = 'TensorFlow'), (SELECT id FROM entities WHERE name = 'Machine Learning'), 'USED_FOR', 0.90),
((SELECT id FROM entities WHERE name = 'PyTorch'), (SELECT id FROM entities WHERE name = 'Machine Learning'), 'USED_FOR', 0.90),
((SELECT id FROM entities WHERE name = 'Python'), (SELECT id FROM entities WHERE name = 'Data Science'), 'USED_FOR', 0.85),
((SELECT id FROM entities WHERE name = 'BERT'), (SELECT id FROM entities WHERE name = 'Transformer'), 'BASED_ON', 0.90),
((SELECT id FROM entities WHERE name = 'Transformer'), (SELECT id FROM entities WHERE name = 'Natural Language Processing'), 'USED_FOR', 0.85);

-- Insert sample documents for testing
INSERT INTO documents (title, content, classification, metadata, file_name, file_type, file_size) VALUES
(
    'Introduction to Machine Learning',
    'Machine learning is a subset of artificial intelligence that enables computers to learn and make decisions without explicit programming. This document covers the fundamental concepts, algorithms, and applications of machine learning in modern technology. Key topics include supervised learning, unsupervised learning, reinforcement learning, and deep learning techniques. The document also explores popular frameworks like TensorFlow and PyTorch, and programming languages such as Python that are commonly used in machine learning projects.',
    'Technical Documentation',
    '{"author": "AI Research Team", "version": "1.0", "last_updated": "2024-01-15", "tags": ["ML", "AI", "Education"]}',
    'ml_introduction.pdf',
    'application/pdf',
    1024000
),
(
    'Azure AI Services Overview',
    'Microsoft Azure provides a comprehensive suite of AI services that enable developers to build intelligent applications. This document outlines the various AI services available on Azure, including Cognitive Services, Machine Learning Studio, and Bot Framework. The document covers use cases, pricing models, and integration patterns for each service. Special attention is given to Natural Language Processing capabilities and computer vision services that can be leveraged for enterprise applications.',
    'Product Specification',
    '{"author": "Microsoft Documentation Team", "version": "2.1", "category": "Cloud Services", "audience": "Developers"}',
    'azure_ai_overview.docx',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    2048000
),
(
    'Deep Learning with Neural Networks',
    'Deep learning represents a significant advancement in machine learning, utilizing neural networks with multiple layers to model and understand complex patterns in data. This research paper examines the architecture of deep neural networks, including convolutional neural networks (CNNs) for image processing and recurrent neural networks (RNNs) for sequential data. The paper discusses training methodologies, optimization techniques, and practical applications in computer vision and natural language processing.',
    'Research Paper',
    '{"authors": ["Dr. Jane Smith", "Dr. John Doe"], "journal": "Journal of AI Research", "year": "2024", "doi": "10.1000/182"}',
    'deep_learning_research.pdf',
    'application/pdf',
    3072000
),
(
    'Q4 2023 AI Market Analysis',
    'The artificial intelligence market experienced significant growth in Q4 2023, driven by increased adoption of generative AI technologies and enterprise AI solutions. This report analyzes market trends, key players, and growth projections for the AI industry. Major findings include a 45% increase in AI investment, widespread adoption of large language models, and emerging applications in healthcare and finance sectors. The report provides strategic recommendations for businesses looking to leverage AI technologies.',
    'Business Report',
    '{"analyst": "Tech Market Research", "quarter": "Q4 2023", "report_type": "Market Analysis", "pages": 25}',
    'q4_ai_market_report.pdf',
    'application/pdf',
    1536000
),
(
    'NLP Best Practices and Implementation Guide',
    'Natural Language Processing (NLP) has become essential for modern applications dealing with text data. This guide provides best practices for implementing NLP solutions, covering text preprocessing, feature extraction, model selection, and evaluation metrics. The document includes practical examples using popular libraries such as NLTK, spaCy, and Transformers. Special sections cover handling multilingual content, dealing with domain-specific terminology, and optimizing models for production deployment.',
    'Technical Documentation',
    '{"author": "NLP Engineering Team", "difficulty": "Intermediate", "code_examples": true, "libraries": ["NLTK", "spaCy", "Transformers"]}',
    'nlp_best_practices.md',
    'text/markdown',
    512000
);

-- Link documents to entities
INSERT INTO document_entities (document_id, entity_id, relevance_score, context) VALUES
-- ML Introduction document
(1, (SELECT id FROM entities WHERE name = 'Machine Learning'), 0.95, 'Primary topic of the document'),
(1, (SELECT id FROM entities WHERE name = 'Artificial Intelligence'), 0.90, 'Discussed as parent concept'),
(1, (SELECT id FROM entities WHERE name = 'Deep Learning'), 0.80, 'Covered as advanced technique'),
(1, (SELECT id FROM entities WHERE name = 'TensorFlow'), 0.75, 'Mentioned as popular framework'),
(1, (SELECT id FROM entities WHERE name = 'PyTorch'), 0.75, 'Mentioned as popular framework'),
(1, (SELECT id FROM entities WHERE name = 'Python'), 0.70, 'Discussed as programming language'),

-- Azure AI document
(2, (SELECT id FROM entities WHERE name = 'Azure'), 0.95, 'Primary platform discussed'),
(2, (SELECT id FROM entities WHERE name = 'Microsoft'), 0.90, 'Platform provider'),
(2, (SELECT id FROM entities WHERE name = 'Artificial Intelligence'), 0.85, 'Core service category'),
(2, (SELECT id FROM entities WHERE name = 'Natural Language Processing'), 0.80, 'Specific service mentioned'),

-- Deep Learning research
(3, (SELECT id FROM entities WHERE name = 'Deep Learning'), 0.95, 'Primary research topic'),
(3, (SELECT id FROM entities WHERE name = 'Neural Network'), 0.90, 'Core technology discussed'),
(3, (SELECT id FROM entities WHERE name = 'Machine Learning'), 0.85, 'Parent field'),
(3, (SELECT id FROM entities WHERE name = 'Natural Language Processing'), 0.75, 'Application area'),

-- Market Analysis
(4, (SELECT id FROM entities WHERE name = 'Artificial Intelligence'), 0.95, 'Market focus'),
(4, (SELECT id FROM entities WHERE name = 'Machine Learning'), 0.80, 'Technology segment'),

-- NLP Guide
(5, (SELECT id FROM entities WHERE name = 'Natural Language Processing'), 0.95, 'Primary topic'),
(5, (SELECT id FROM entities WHERE name = 'Transformer'), 0.85, 'Technology discussed'),
(5, (SELECT id FROM entities WHERE name = 'Python'), 0.80, 'Implementation language');

-- Insert sample search history
INSERT INTO search_history (query, search_type, filters, results_count, processing_time_ms, user_session) VALUES
('machine learning fundamentals', 'semantic', '{"classification": "Technical Documentation"}', 3, 245, 'session_001'),
('Azure AI services', 'keyword', '{}', 2, 180, 'session_002'),
('deep learning neural networks', 'semantic', '{"entity_type": "CONCEPT"}', 4, 320, 'session_003'),
('natural language processing', 'vector', '{}', 5, 410, 'session_001'),
('AI market trends 2023', 'keyword', '{"classification": "Business Report"}', 1, 150, 'session_004'),
('tensorflow pytorch comparison', 'semantic', '{}', 2, 275, 'session_002'),
('Microsoft cognitive services', 'keyword', '{"entity_type": "TECHNOLOGY"}', 3, 190, 'session_005');

-- Insert sample workflow executions
INSERT INTO workflow_executions (workflow_id, workflow_type, status, input_data, output_data, processing_time_ms, completed_at) VALUES
('wf_doc_proc_001', 'document_processing', 'completed', 
 '{"title": "ML Introduction", "enable_classification": true, "enable_entities": true}',
 '{"document_id": 1, "classification": "Technical Documentation", "entities_extracted": 6}',
 5420, DATEADD(minute, -30, GETUTCDATE())),

('wf_doc_proc_002', 'document_processing', 'completed', 
 '{"title": "Azure AI Overview", "enable_classification": true, "enable_entities": true}',
 '{"document_id": 2, "classification": "Product Specification", "entities_extracted": 4}',
 4890, DATEADD(minute, -25, GETUTCDATE())),

('wf_batch_001', 'batch_processing', 'completed_with_errors', 
 '{"files_count": 3, "enable_classification": true}',
 '{"successful": 2, "failed": 1, "total_processing_time": 12340}',
 12340, DATEADD(minute, -20, GETUTCDATE()));

-- Insert sample system metrics
INSERT INTO system_metrics (metric_name, metric_value, service_name, recorded_at) VALUES
('response_time_ms', 156.7, 'phi4', DATEADD(minute, -5, GETUTCDATE())),
('response_time_ms', 89.2, 'sql', DATEADD(minute, -5, GETUTCDATE())),
('response_time_ms', 234.1, 'graphrag', DATEADD(minute, -5, GETUTCDATE())),
('response_time_ms', 178.9, 'search', DATEADD(minute, -5, GETUTCDATE())),
('documents_processed', 1, 'orchestrator', DATEADD(minute, -10, GETUTCDATE())),
('search_queries', 1, 'search', DATEADD(minute, -8, GETUTCDATE())),
('entities_extracted', 15, 'graphrag', DATEADD(minute, -12, GETUTCDATE())),
('classification_accuracy', 0.94, 'phi4', DATEADD(minute, -15, GETUTCDATE()));

-- Create sample data queries for testing

-- Test document search
/*
EXEC sp_SearchDocuments 
    @Query = 'machine learning',
    @Classification = NULL,
    @EntityType = NULL,
    @Limit = 5,
    @Offset = 0;
*/

-- Test document with context
/*
EXEC sp_GetDocumentWithContext 
    @DocumentId = 1,
    @IncludeRelatedDocs = 1;
*/

-- Test knowledge graph
/*
EXEC sp_GetKnowledgeGraph 
    @DocumentId = 1,
    @EntityType = NULL,
    @Depth = 2;
*/

-- Test entity relationships view
/*
SELECT TOP 10 * FROM vw_entity_relationships
ORDER BY created_at DESC;
*/

-- Test document similarity function
/*
SELECT 
    d1.title as doc1,
    d2.title as doc2,
    dbo.fn_CalculateDocumentSimilarity(d1.id, d2.id) as similarity
FROM documents d1
CROSS JOIN documents d2
WHERE d1.id < d2.id
AND dbo.fn_CalculateDocumentSimilarity(d1.id, d2.id) > 0
ORDER BY similarity DESC;
*/