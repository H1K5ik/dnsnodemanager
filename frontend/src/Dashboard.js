import React from "react";
import Box from '@material-ui/core/Box';
import LinearProgress from '@material-ui/core/LinearProgress';

import { useTranslation } from "./common/LanguageContext";
import useAPI from "./common/api";

export default function Dashboard(props) {
  const [stats, setStats] = React.useState(null);
  const { t } = useTranslation();
  const api = useAPI();

  function getStats() {
    api.getStats().then(setStats);
  }

  React.useEffect(getStats, []);  // eslint-disable-line

  return stats === null ? <LinearProgress /> : (
    <Box>
      <Box>{t('dashboard.serverCount')}: {stats.serverCount}</Box>
      <Box>{t('dashboard.viewCount')}: {stats.viewCount}</Box>
      <Box>{t('dashboard.zoneCount')}: {stats.zoneCount}</Box>
      <Box>{t('dashboard.recordCount')}: {stats.recordCount}</Box>
    </Box>
  );

}
