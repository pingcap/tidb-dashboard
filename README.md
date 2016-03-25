# pd
placement driver

## Docker

### Build

```
docker build -t pingcap/pd .
```

### Usage

```
docker run -d -p 2379:2379 -p 2380:2380 -p 4001:4001 -p 7001:7001 -p 1234:1234 --name pd pingcap/pd 
```