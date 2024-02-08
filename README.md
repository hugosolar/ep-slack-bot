# ep-slack-bot
Bot for checking EP indices status

## Usage

### Get
Get the health status of a group of indices configured in .json (example at config-stage.json) file

```
/elasticpress get <group_of_indices>
```

### Monitor start
Start monitoring a group of indices defined in the json config (config-stage.json)

```
/elasticpress monitor-start <group_of_indices>
```

### Monitor stop
Stop monitoring group of indices

```
/elasticpress monitor-stop <group_of_indices>
```

### Monitor list
Lists the groups of indices being monitored

```
/elasticpress monitor-list
```
