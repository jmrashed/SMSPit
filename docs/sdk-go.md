> Mirrored from [`sdks/go/`](https://github.com/jmrashed/SMSPit/tree/main/sdks/go/) in the main repo — relative links/paths below refer to that location, not this docs site.

# smspit (Go)

Go client for SMSPit's native REST API. Built on `net/http` only -- no third-party dependency.

**Status:** send/list/get/replay implemented (checklist Day 90). Not yet tagged/published as a versioned module (checklist Day 93).

## Install (until tagged, use a `replace` directive)

```go
require github.com/jmrashed/SMSPit/sdks/go v0.0.0

replace github.com/jmrashed/SMSPit/sdks/go => ../SMSPit/sdks/go
```

## Usage

```go
client := smspit.New("http://localhost:8080", "sms_live_xxx.yyy")

message, err := client.Send("+8801700000000", "SMSPit", "Your OTP is 123456")
_, err = client.Replay(message.ID)
page, err := client.List(smspit.ListParams{Limit: 20})
```

See [examples/send-and-list/main.go](examples/send-and-list/main.go) for a runnable example (`SMSPIT_API_KEY=... go run ./examples/send-and-list`).

## Development

```sh
go test ./...
```
