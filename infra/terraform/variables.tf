variable "do_token" {
  description = "DigitalOcean Personal Access Token (write scope)"
  type        = string
  sensitive   = true
}

variable "project" {
  description = "Slug used as a prefix for every resource"
  type        = string
  default     = "joinevents"
}

variable "region" {
  description = "DO region. blr1 for India proximity, sgp1 for Singapore."
  type        = string
  default     = "blr1"
}

variable "database_name" {
  type    = string
  default = "joinevents"
}

variable "pg_size_primary" {
  description = "DO db-* slug for primary. db-s-2vcpu-4gb is fine until 100k MAU."
  type        = string
  default     = "db-s-2vcpu-4gb"
}

variable "pg_size_replica" {
  type    = string
  default = "db-s-1vcpu-2gb"
}

variable "redis_size" {
  type    = string
  default = "db-s-1vcpu-1gb"
}

variable "pool_size" {
  type    = number
  default = 25
}
