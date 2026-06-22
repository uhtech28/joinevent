# Outputs — feed straight into apps/api/.env on the production server.

output "DATABASE_URL" {
  description = "Primary writable connection (pooled)"
  value       = digitalocean_database_connection_pool.write_pool.uri
  sensitive   = true
}

output "DATABASE_URL_READ_1" {
  description = "Read replica 1"
  value       = digitalocean_database_replica.read_1.uri
  sensitive   = true
}

output "DATABASE_URL_READ_2" {
  description = "Read replica 2"
  value       = digitalocean_database_replica.read_2.uri
  sensitive   = true
}

output "REDIS_URL" {
  value     = digitalocean_database_cluster.redis.uri
  sensitive = true
}
