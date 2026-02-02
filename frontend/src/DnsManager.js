import React from "react";
import Button from '@material-ui/core/Button';
import VisibilityIcon from '@material-ui/icons/Visibility';
import Paper from '@material-ui/core/Paper';
import Tab from '@material-ui/core/Tab';
import TabPanel from '@material-ui/lab/TabPanel';
import TabContext from '@material-ui/lab/TabContext';
import TabList from '@material-ui/lab/TabList';
import LinearProgress from '@material-ui/core/LinearProgress';

import ContentHeader from "./ContentHeader";
import DnsZoneManager from "./DnsZoneManager";
import DnsViewsDialog from "./DnsViewsDialog";

import { AuthenticationContext } from "./common/AuthenticationProvider";
import { useTranslation } from "./common/LanguageContext";
import useAPI from './common/api';

export default function DnsManager(props) {
  const [nsGroups, setNsGroups] = React.useState([]);
  const [dnsZones, setDnsZones] = React.useState([]);
  const [dnsViews, setDnsViews] = React.useState([]);
  const [fwdGroups, setFwdGroups] = React.useState([]);
  const [activeView, setActiveView] = React.useState('default');
  const [viewDialogOpen, setViewDialogOpen] = React.useState(false);
  const api = useAPI();

  const session = React.useContext(AuthenticationContext);
  const { t } = useTranslation();
  const canEdit = ['dnsop','dnsadmin','sysadmin'].includes(session.user.role);

  function switchView(e, value) {
    setActiveView(value);
  }

  function getNsGroups() {
    api.getNsGroups().then(setNsGroups);
  }

  function getFwdGroups() {
    api.getFwdGroups().then(setFwdGroups);
  }

  function getDnsZones() {
    api.getDnsZones().then(setDnsZones);
  }

  function getDnsViews() {
    api.getDnsViews().then(setDnsViews);
  }

  React.useEffect(getNsGroups, []);  // eslint-disable-line
  React.useEffect(getFwdGroups, []); // eslint-disable-line
  React.useEffect(getDnsZones, []); // eslint-disable-line
  React.useEffect(getDnsViews, []); // eslint-disable-line

  return (
    <>
      <ContentHeader title={t("dns.title")}>
        <Button variant="contained" color="primary" startIcon={<VisibilityIcon />} onClick={() => { setViewDialogOpen(true); }}>{t("dns.manageViews")}</Button>
        <DnsViewsDialog open={viewDialogOpen} views={dnsViews} readOnly={!canEdit} onClose={() => { setViewDialogOpen(false); }} onRefresh={getDnsViews} />
      </ContentHeader>
      <Paper>
        { dnsViews.length < 1 ? <LinearProgress /> : (
          <TabContext value={activeView}>
            <TabList onChange={switchView} indicatorColor="primary" textColor="primary">
            { dnsViews.map( view => <Tab key={view.name} value={view.name} label={view.name} /> ) }
            </TabList>
            { dnsViews.map( view => (
              <TabPanel key={view.name} value={view.name}>
                <DnsZoneManager view={view} nsGroups={nsGroups} fwdGroups={fwdGroups} zones={dnsZones.filter( zone => { return zone.view === view.name })} onRefresh={getDnsZones} />
              </TabPanel>
            ) ) }
          </TabContext>
        ) }
      </Paper>
    </>
  );
}
