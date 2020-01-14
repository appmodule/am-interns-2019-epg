FROM mariadb:10-bionic

COPY init-db.sql /docker-entrypoint-initdb.d
COPY wait-for-it.sh /

# CMD ["/wait-for-it.sh", "db:3306","mysqld"]