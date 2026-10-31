FROM golang:1.24.7-alpine3.22 AS build
WORKDIR /src
COPY services/chat/go.mod ./go.mod
COPY services/chat ./
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/chat ./cmd/server

FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /out/chat /chat
EXPOSE 3002
ENTRYPOINT ["/chat"]
