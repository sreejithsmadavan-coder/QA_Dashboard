USE qa_nexus;

DELETE FROM test_executions 
WHERE projectId = (SELECT id FROM projects WHERE name = 'HR Management System');

DELETE FROM projects 
WHERE name = 'HR Management System';

SELECT * FROM projects;
