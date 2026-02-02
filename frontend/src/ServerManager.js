import React, {useEffect, useState} from "react";
import ServerManagerRow from "./ServerManagerRow";
import ServerManagerDialog from "./ServerManagerDialog";

import Box from '@material-ui/core/Box';
import Paper from '@material-ui/core/Paper';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import TableCell from '@material-ui/core/TableCell';
import LinearProgress from '@material-ui/core/LinearProgress';
import Button from '@material-ui/core/Button';
import AddCircle from '@material-ui/icons/AddCircle';
import InfoIcon from '@material-ui/icons/Info';
import VpnKey from '@material-ui/icons/VpnKey';
import DoneIcon from '@material-ui/icons/Done';
import ClearIcon from '@material-ui/icons/Clear';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import TextField from '@material-ui/core/TextField';
import Chip from '@material-ui/core/Chip';

import ContentHeader from './ContentHeader';
import ServerManagerGuide from './ServerManagerGuide';
import { AuthenticationContext } from "./common/AuthenticationProvider";
import { NotificationContext } from './common/NotificationProvider';
import { useTranslation } from './common/LanguageContext';
import useAPI from './common/api'

export default function ServerManager(props) {
  const [loading, setLoading] = useState(true);
  const [servers, setServers] = useState([]);
  const [healthCheckOpen, setHealthCheckOpen] = useState(false);
  const [healthCheckData, setHealthCheckData] = useState(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [sshInfoOpen, setSshInfoOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [sshPubKey, setSshPubKey] = useState(null);
  const notifier = React.useContext(NotificationContext);
  const api = useAPI();

  const session = React.useContext(AuthenticationContext);
  const { t } = useTranslation();
  const canEdit = ['dnsadmin','sysadmin'].includes(session.user.role);

  function getServers() {
    setLoading(true);
    api.getServers().then( response => {
      setServers(response);
      setLoading(false);
    } );
  }

  function getSshPubKey() {
    api.getSshPubKey().then( response => {
      console.log(response);
      setSshPubKey(response.pubKey);
    } );
  }

  function addServer(data) {
    setAddDialogOpen(false);
    return api.addServer(data).then( response => {
      if( ! response ) setAddDialogOpen(true);
      else getServers();
    } );
  }

  function editServer(data) {
    return api.updateServer(data).then(getServers);
  }

  function deleteServer(data) {
    if( window.confirm(t("servers.deleteConfirm")) ) {
      return api.deleteServer(data).then(getServers);
    }
  }

  function checkServerConnection(data) {
    notifier.showBackdrop();
    api.getSshHealth(data.ID).then( result => {
      notifier.hideBackdrop();
      if( result.success ) {
        setHealthCheckData(result);
        setHealthCheckOpen(true);
        notifier.setNotification("success", t("servers.sshWorking"));
      } else {
        setHealthCheckData(result);
        setHealthCheckOpen(true);
        notifier.setNotification("error", t("servers.sshBroken"));
      }
      // Reload serverlist if we have a different result
      if( Boolean(data.last_status) !== result.success ) getServers();
    } );
  }

  useEffect(getServers, []);  // eslint-disable-line

  return (
    <>
      <ContentHeader title={t("servers.title")}>
        <Button variant="contained" color="primary" disabled={!canEdit} startIcon={<InfoIcon />} onClick={() => { setGuideOpen(true); }}>{t("servers.managedConfigGuide")}</Button>
        <Dialog open={guideOpen} onClose={() => { setGuideOpen(false); }}>
          <DialogTitle>{t("servers.managedConfigGuide")}</DialogTitle>
          <DialogContent>
            <ServerManagerGuide />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => { setGuideOpen(false); }}>{t("app.close")}</Button>
          </DialogActions>
        </Dialog>
        <Button variant="contained" color="primary" disabled={!canEdit} startIcon={<VpnKey />} style={{marginLeft: 10}} onClick={() => { setSshInfoOpen(true); }}>{t("servers.sshKeyInfo")}</Button>
        <Dialog open={sshInfoOpen} TransitionProps={{ onEntering: getSshPubKey }} maxWidth="xs">
          <DialogTitle>{t("servers.sshKeyInfo")}</DialogTitle>
          <DialogContent>
            <p>
              {t("servers.sshKeyInfoText")}
            </p>
            <Box>{sshPubKey === null ? <LinearProgress /> : <TextField fullWidth inputProps={{readOnly: true}} variant="outlined" defaultValue={sshPubKey} />}</Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => { setSshInfoOpen(false); }}>{t("app.close")}</Button>
          </DialogActions>
        </Dialog>
        <Button variant="contained" color="primary" disabled={!canEdit} startIcon={<AddCircle />} style={{marginLeft: 10}} onClick={() => { setAddDialogOpen(true); }}>{t("servers.addServer")}</Button>
        <ServerManagerDialog new open={addDialogOpen} onSubmit={addServer} toggleFunc={() => { setAddDialogOpen(false); }} />
      </ContentHeader>
      <TableContainer component={Paper}>
        <Table aria-label="simple table">
          <TableHead>
            <TableRow>
              <TableCell>&nbsp;</TableCell>
              <TableCell>{t("servers.serverName")}</TableCell>
              <TableCell>{t("servers.nsFqdn")}</TableCell>
              <TableCell>{t("servers.ipAddress")}</TableCell>
              <TableCell>{t("servers.type")}</TableCell>
              <TableCell>{t("servers.status")}</TableCell>
              <TableCell>{t("servers.sshHealth")}</TableCell>
              <TableCell>{t("servers.configSync")}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            { loading ? <></> : servers.map( row => (
              <ServerManagerRow key={row.ID} data={row} readOnly={!canEdit} onDelete={deleteServer} onEdit={editServer} onRefresh={getServers} onCheck={checkServerConnection} />
            ) ) }
          </TableBody>
        </Table>
      </TableContainer>
      { loading && ( <Box m={2}><LinearProgress /></Box> ) }
      <Dialog open={healthCheckOpen} onClose={() => { setHealthCheckOpen(false); }}>
        <DialogTitle>{t("servers.healthCheckResult")}</DialogTitle>
        <DialogContent>
          { healthCheckData !== null && (
            <>
              <Box m={2}>{t("servers.checkingSsh", { server: healthCheckData.server })}</Box>
              <HealthCheckSection success={healthCheckData.sshConnection} label={t("servers.sshLogin")} detail={t("servers.sshLoginDetail")} />
              <HealthCheckSection success={healthCheckData.confDirWritable} label={t("servers.confDirWritable")} detail={t("servers.confDirDetail")} />
              <HealthCheckSection success={healthCheckData.groupMembership} label={t("servers.groupMembership")} detail={t("servers.groupMembershipDetail")} />
              <HealthCheckSection success={healthCheckData.rndcCommands} label={t("servers.rndcCommands")} detail={t("servers.rndcDetail")} />
            </>
          ) }
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setHealthCheckOpen(false); }}>{t("app.close")}</Button>
        </DialogActions>
      </Dialog>
    </>
  );

}

function HealthCheckSection(props) {
  let color = props.success === true ? 'primary' : 'secondary';
  if( props.success === null ) color = 'default';
  const icon = props.success === true ? <DoneIcon /> : <ClearIcon />;
  return (
    <Box m={2}>
      <Chip label={props.label} color={color} icon={icon} />
      <p>{props.detail}</p>
      { typeof props.success === 'string' && <p style={{color:'Red'}}>{props.success}</p> }
    </Box>
  );
}
