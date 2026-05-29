# syntax=docker/dockerfile:1.7

# ---- planner stage ----
FROM rust:1.83-bookworm AS planner
WORKDIR /app
RUN cargo install cargo-chef --locked
COPY . .
RUN cargo chef prepare --recipe-path recipe.json

# ---- builder stage ----
FROM rust:1.83-bookworm AS builder
ARG SVC
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    protobuf-compiler pkg-config libssl-dev clang \
 && rm -rf /var/lib/apt/lists/*
RUN cargo install cargo-chef --locked
COPY --from=planner /app/recipe.json recipe.json
RUN cargo chef cook --release --recipe-path recipe.json
COPY . .
RUN cargo build --release -p sequoia-${SVC}

# ---- runtime stage ----
FROM gcr.io/distroless/cc-debian12:nonroot AS runtime
ARG SVC
WORKDIR /
COPY --from=builder /app/target/release/${SVC} /usr/local/bin/svc
USER nonroot:nonroot
ENTRYPOINT ["/usr/local/bin/svc"]
