#!/bin/bash
echo "Setting up PostgreSQL database for CodeForce..."
echo ""
echo "This script will:"
echo "1. Create a database user 'codeforce_user'"
echo "2. Create a database 'codeforce'"
echo ""
read -p "Enter a password for codeforce_user: " -s password
echo ""

# Create user and database
psql -U weijiahuang -d postgres << SQL
CREATE USER codeforce_user WITH PASSWORD '$password';
CREATE DATABASE codeforce OWNER codeforce_user;
GRANT ALL PRIVILEGES ON DATABASE codeforce TO codeforce_user;
\q
SQL

echo ""
echo "Database setup complete!"
echo ""
echo "Update your .env file with:"
echo "DATABASE_URL=\"postgresql://codeforce_user:$password@localhost:5432/codeforce?schema=public\""
