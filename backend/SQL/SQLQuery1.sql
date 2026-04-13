USE master;

-- Enable Mixed Mode (SQL + Windows Auth)
EXEC xp_instance_regwrite 
  N'HKEY_LOCAL_MACHINE', 
  N'Software\Microsoft\MSSQLServer\MSSQLServer',
  N'LoginMode', 
  REG_DWORD, 
  2;

-- Enable sa account
ALTER LOGIN sa ENABLE;

-- Set password for sa
ALTER LOGIN sa WITH PASSWORD = 'QaNexus@123';

PRINT 'Done - sa account enabled';
