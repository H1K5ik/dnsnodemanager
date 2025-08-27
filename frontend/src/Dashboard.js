import React from "react";
import Box from '@material-ui/core/Box';
import LinearProgress from '@material-ui/core/LinearProgress';

import useAPI from "./common/api";

export default function Dashboard(props) {
  const [stats, setStats] = React.useState(null);
  const api = useAPI();

  function getStats() {
    api.getStats().then(setStats);
  }

  React.useEffect(getStats, []);  // eslint-disable-line

  return stats === null ? <LinearProgress /> : (
    <Box>
      <Box>Server Count: {stats.serverCount}</Box>
      <Box>View Count: {stats.viewCount}</Box>
      <Box>Zone Count: {stats.zoneCount}</Box>
      <Box>Record Count: {stats.recordCount}</Box>
    </Box>
  );

}
