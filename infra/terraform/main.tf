# Join Events — production database tier on DigitalOcean.
#
# Provisions:
#   - 1 Managed Postgres 16 primary (with PostGIS)
#   - 2 read replicas in the same region
#   - A connection pool (pgBouncer) attached to the primary
#   - A Redis cluster for session/cache
#
# Apply:
#   terraform init
#   terraform plan -var "do_token=…"
#   terraform apply -var "do_token=…"
#
# The outputs include the connection URIs to drop into DATABASE_URL,
# DATABASE_URL_READ_1, DATABASE_URL_READ_2 and REDIS_URL.

terraform {
  required_providers {
    digitalocean = {
      source  = "digitalocean/digitalocean"
      version = "~> 2.40"
    }
  }
}

provider "digitalocean" {
  token = var.do_token
}

# ============================================================
# Postgres — primary
# ============================================================
resource "digitalocean_database_cluster" "primary" {
  name       = "${var.project}-pg-primary"
  engine     = "pg"
  version    = "16"
  size       = var.pg_size_primary
  region     = var.region
  node_count = 1

  # We can extend the PostGIS extension after creation via psql; DO ships pg16
  # with PostGIS available in the catalog.
}

resource "digitalocean_database_db" "main" {
  cluster_id = digitalocean_database_cluster.primary.id
  name       = var.database_name
}

# Connection pool (pgBouncer) on the primary — used by writes.
resource "digitalocean_database_connection_pool" "write_pool" {
  cluster_id = digitalocean_database_cluster.primary.id
  name       = "${var.project}-write-pool"
  mode       = "transaction"
  size       = var.pool_size
  db_name    = digitalocean_database_db.main.name
  user       = digitalocean_database_cluster.primary.user
}

# ============================================================
# Postgres — 2 read replicas
# ============================================================
resource "digitalocean_database_replica" "read_1" {
  cluster_id = digitalocean_database_cluster.primary.id
  name       = "${var.project}-pg-replica-1"
  size       = var.pg_size_replica
  region     = var.region
}

resource "digitalocean_database_replica" "read_2" {
  cluster_id = digitalocean_database_cluster.primary.id
  name       = "${var.project}-pg-replica-2"
  size       = var.pg_size_replica
  region     = var.region
}

# ============================================================
# Redis — for sessions, OTP cache, BullMQ queues
# ============================================================
resource "digitalocean_database_cluster" "redis" {
  name       = "${var.project}-redis"
  engine     = "redis"
  version    = "7"
  size       = var.redis_size
  region     = var.region
  node_count = 1
}

# ============================================================
# Firewall — only the app servers (by tag) can reach the DBs
# ============================================================
resource "digitalocean_database_firewall" "primary_fw" {
  cluster_id = digitalocean_database_cluster.primary.id
  rule {
    type  = "tag"
    value = "${var.project}-app"
  }
}

resource "digitalocean_database_firewall" "redis_fw" {
  cluster_id = digitalocean_database_cluster.redis.id
  rule {
    type  = "tag"
    value = "${var.project}-app"
  }
}
