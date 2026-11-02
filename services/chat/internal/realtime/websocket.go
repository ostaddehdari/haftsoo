package realtime

import (
	"bufio"
	"crypto/sha1"
	"encoding/base64"
	"errors"
	"io"
	"net"
	"net/http"
	"strings"
	"sync"
	"time"
)

const websocketGUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"

var (
	ErrFrameTooLarge = errors.New("websocket_frame_too_large")
	ErrProtocol      = errors.New("websocket_protocol_error")
)

type Connection struct {
	connection net.Conn
	reader     *bufio.Reader
	writer     *bufio.Writer
	writeMu    sync.Mutex
}

func Upgrade(writer http.ResponseWriter, request *http.Request, allowedOrigins map[string]bool) (*Connection, error) {
	if !headerContains(request.Header, "Connection", "upgrade") || !headerContains(request.Header, "Upgrade", "websocket") || request.Header.Get("Sec-WebSocket-Version") != "13" {
		return nil, ErrProtocol
	}
	origin := request.Header.Get("Origin")
	if origin != "" && len(allowedOrigins) > 0 && !allowedOrigins[origin] {
		return nil, ErrProtocol
	}
	key := strings.TrimSpace(request.Header.Get("Sec-WebSocket-Key"))
	decoded, err := base64.StdEncoding.DecodeString(key)
	if err != nil || len(decoded) != 16 {
		return nil, ErrProtocol
	}
	hijacker, ok := writer.(http.Hijacker)
	if !ok {
		return nil, ErrProtocol
	}
	connection, readWriter, err := hijacker.Hijack()
	if err != nil {
		return nil, err
	}
	digest := sha1.Sum([]byte(key + websocketGUID)) // #nosec G505: SHA-1 is mandated by RFC 6455 handshake.
	accept := base64.StdEncoding.EncodeToString(digest[:])
	if _, err := readWriter.WriteString("HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: " + accept + "\r\n\r\n"); err != nil {
		_ = connection.Close()
		return nil, err
	}
	if err := readWriter.Flush(); err != nil {
		_ = connection.Close()
		return nil, err
	}
	return &Connection{connection: connection, reader: readWriter.Reader, writer: readWriter.Writer}, nil
}

func (connection *Connection) ReadText(maxBytes int) ([]byte, error) {
	_ = connection.connection.SetReadDeadline(time.Now().Add(70 * time.Second))
	first, err := connection.reader.ReadByte()
	if err != nil {
		return nil, err
	}
	second, err := connection.reader.ReadByte()
	if err != nil {
		return nil, err
	}
	if first&0x70 != 0 || first&0x80 == 0 || second&0x80 == 0 {
		return nil, ErrProtocol
	}
	opcode := first & 0x0f
	length := int64(second & 0x7f)
	if length == 126 {
		buffer := make([]byte, 2)
		if _, err := io.ReadFull(connection.reader, buffer); err != nil {
			return nil, err
		}
		length = int64(buffer[0])<<8 | int64(buffer[1])
	} else if length == 127 {
		buffer := make([]byte, 8)
		if _, err := io.ReadFull(connection.reader, buffer); err != nil {
			return nil, err
		}
		length = 0
		for _, value := range buffer {
			length = length<<8 | int64(value)
		}
	}
	if length < 0 || length > int64(maxBytes) {
		return nil, ErrFrameTooLarge
	}
	mask := make([]byte, 4)
	if _, err := io.ReadFull(connection.reader, mask); err != nil {
		return nil, err
	}
	payload := make([]byte, int(length))
	if _, err := io.ReadFull(connection.reader, payload); err != nil {
		return nil, err
	}
	for index := range payload {
		payload[index] ^= mask[index%4]
	}
	switch opcode {
	case 0x1:
		return payload, nil
	case 0x8:
		return nil, io.EOF
	case 0x9:
		if err := connection.writeFrame(0xA, payload); err != nil {
			return nil, err
		}
		return connection.ReadText(maxBytes)
	default:
		return nil, ErrProtocol
	}
}

func (connection *Connection) WriteText(payload []byte) error {
	return connection.writeFrame(0x1, payload)
}

func (connection *Connection) Close() error {
	_ = connection.writeFrame(0x8, nil)
	return connection.connection.Close()
}

func (connection *Connection) writeFrame(opcode byte, payload []byte) error {
	connection.writeMu.Lock()
	defer connection.writeMu.Unlock()
	_ = connection.connection.SetWriteDeadline(time.Now().Add(10 * time.Second))
	if err := connection.writer.WriteByte(0x80 | opcode); err != nil {
		return err
	}
	length := len(payload)
	switch {
	case length < 126:
		if err := connection.writer.WriteByte(byte(length)); err != nil {
			return err
		}
	case length <= 65535:
		if _, err := connection.writer.Write([]byte{126, byte(length >> 8), byte(length)}); err != nil {
			return err
		}
	default:
		return ErrFrameTooLarge
	}
	if _, err := connection.writer.Write(payload); err != nil {
		return err
	}
	return connection.writer.Flush()
}

func headerContains(header http.Header, name, value string) bool {
	for _, part := range strings.Split(header.Get(name), ",") {
		if strings.EqualFold(strings.TrimSpace(part), value) {
			return true
		}
	}
	return false
}
