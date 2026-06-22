# Infrastructure as Code — production database tier

## Two paths to HA Postgres

### Path A: DigitalOcean Managed Postgres (recommended for years 0–2)
- `main.tf` provisions: 1 primary + 2 read replicas + pgBouncer pool + managed Redis
- DO handles automated backups, point-in-time recovery, minor version upgrades, and failover
- Cost at MVP scale: ~$60/month primary + $30 each replica + $15 redis = **~$135/month**

### Path B: Self-managed Patroni HA (when DO becomes expensive at scale)
- `../patroni/patroni.yml` is a production-ready Patroni configuration
- Run on 3 VMs (Kubernetes StatefulSet works too) coordinated by etcd
- Auto-elects a leader, promotes a replica on failover, reconfigures HAProxy
- More work to operate, but ~40% cheaper at >500k MAU

## Apply Path A

```bash
# One-time
export DO_PAT='dop_v1_...'
terraform init

# Plan + apply
terraform plan -var "do_token=$DO_PAT"
terraform apply -var "do_token=$DO_PAT"

# Get the connection strings
terraform output -raw DATABASE_URL
terraform output -raw DATABASE_URL_READ_1
terraform output -raw DATABASE_URL_READ_2
terraform output -raw REDIS_URL
```

Drop those into `apps/api/.env` on your production server. The Prisma client
automatically round-robins reads between the two replicas (see
`apps/api/src/prisma/prisma.service.ts`).

## After provisioning, run migrations

```bash
DATABASE_URL='<primary url from terraform output>' \
  pnpm --filter @joinevents/api prisma:migrate:deploy
```

## Path B (Patroni) — quick reference

```bash
# On each of pg-0, pg-1, pg-2:
sudo apt install patroni
export HOST_IP=$(hostname -I | awk '{print $1}')
sudo patroni /etc/patroni/patroni.yml

# Cluster status
patronictl -c /etc/patroni/patroni.yml list
```

For client routing, point your application's primary URL at HAProxy/PgBouncer
in front of the cluster. Patroni's REST API at `:8008/leader` returns 200 on
the current leader and 503 elsewhere — HAProxy uses this for health checks.
