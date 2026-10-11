psql "postgres://postgres:postgres@db:5432/postgres" -q -c "drop database if exists welltutored_r" -c "create database welltutored_r template welltutored_pre55"
