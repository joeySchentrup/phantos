FROM node:20-alpine AS development-dependencies-env
COPY . /app
WORKDIR /app
RUN npm ci

FROM node:20-alpine AS build-env
COPY . /app/
COPY --from=development-dependencies-env /app/node_modules /app/node_modules
WORKDIR /app
RUN npm run build


FROM alpine:latest
ARG PB_VERSION=0.40.4

RUN apk add --no-cache \
    unzip \
    ca-certificates

# download and unzip PocketBase
ADD https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip /tmp/pb.zip
RUN unzip /tmp/pb.zip -d /pb/

# copy built frontend files
COPY --from=build-env /app/build/client /pb/pb_public

# schema + the seed of the original lore (applied automatically on start)
COPY pb_migrations /pb/pb_migrations
COPY lore /pb/lore

# server-side JS hooks (search, featured image, slugs and word counts)
COPY pb_hooks /pb/pb_hooks

EXPOSE 8080

# Mount a volume at /pb/pb_data — that's where the database and uploads live.
#
# OPENAI_API_KEY turns on featured-image generation from the DM page.
# DM_EMAIL / DM_PASSWORD create the first Dungeon Master account if it doesn't
# exist yet (or create one from the admin UI at /_/).
ENV LORE_DIR=/pb/lore \
    OPENAI_API_KEY="" \
    OPENAI_IMAGE_MODEL="" \
    OPENAI_IMAGE_QUALITY="" \
    DM_EMAIL="" \
    DM_PASSWORD=""

# start PocketBase
CMD ["/pb/pocketbase", "serve", "--http=0.0.0.0:8080"]
