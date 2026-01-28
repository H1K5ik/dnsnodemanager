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
    if( window.confirm("Really delete this server from the configuration?") ) {
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
        notifier.setNotification("success", "SSH connection working properly!");
      } else {
        setHealthCheckData(result);
        setHealthCheckOpen(true);
        notifier.setNotification("error", "SSH connection broken!");
      }
      // Reload serverlist if we have a different result
      if( Boolean(data.last_status) !== result.success ) getServers();
    } );
  }

  useEffect(getServers, []);  // eslint-disable-line

  return (
    <>
      <ContentHeader title="Manage Nameservers">
        <Button variant="contained" color="primary" disabled={!canEdit} startIcon={<InfoIcon />} onClick={() => { setGuideOpen(true); }}>Managed Config Guide</Button>
        <Dialog open={guideOpen} onClose={() => { setGuideOpen(false); }}>
          <DialogTitle>Managed Config Guide</DialogTitle>
          <DialogContent>
            <ServerManagerGuide />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => { setGuideOpen(false); }}>Close</Button>
          </DialogActions>
        </Dialog>
        <Button variant="contained" color="primary" disabled={!canEdit} startIcon={<VpnKey />} style={{marginLeft: 10}} onClick={() => { setSshInfoOpen(true); }}>SSH Key Info</Button>
        <Dialog open={sshInfoOpen} TransitionProps={{ onEntering: getSshPubKey }} maxWidth="xs">
          <DialogTitle>SSH Key Info</DialogTitle>
          <DialogContent>
            <p>
              Bind configuration files are distributed to managed servers through SSH.<br />
              You can either deposit the ssh users password for each server or authorize this public key on the target systems for PubKey Authentication (recommended for production):
            </p>
            <Box>{sshPubKey === null ? <LinearProgress /> : <TextField fullWidth inputProps={{readOnly: true}} variant="outlined" defaultValue={sshPubKey} />}</Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => { setSshInfoOpen(false); }}>Close</Button>
          </DialogActions>
        </Dialog>
        <Button variant="contained" color="primary" disabled={!canEdit} startIcon={<AddCircle />} style={{marginLeft: 10}} onClick={() => { setAddDialogOpen(true); }}>Add Server</Button>
        <ServerManagerDialog new open={addDialogOpen} onSubmit={addServer} toggleFunc={() => { setAddDialogOpen(false); }} />
      </ContentHeader>
      <TableContainer component={Paper}>
        <Table aria-label="simple table">
          <TableHead>
            <TableRow>
              <TableCell>&nbsp;</TableCell>
              <TableCell>Server Name</TableCell>
              <TableCell>NS FQDN</TableCell>
              <TableCell>IP Address</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>SSH Health</TableCell>
              <TableCell>Config Sync</TableCell>
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
        <DialogTitle>HealthCheck Result</DialogTitle>
        <DialogContent>
          { healthCheckData !== null && (
            <>
              <Box m={2}>Checking SSH Connection and config managability for {healthCheckData.server} ...</Box>
              <HealthCheckSection success={healthCheckData.sshConnection} label="SSH Login" detail="Attemped to login through SSH to remote system" />
              <HealthCheckSection success={healthCheckData.confDirWritable} label="Configuration directory writabl" detail="Configured directory must be writable for the management user" />
              <HealthCheckSection success={healthCheckData.groupMembership} label="Bind/Named group membership" detail="The management user must be member of either 'bind' or 'named' group" />
              <HealthCheckSection success={healthCheckData.rndcCommands} label="RNDC commands executable" detail="Trying to execute '/usr/sbin/rndc status' to verify rndc function" />
            </>
          ) }
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setHealthCheckOpen(false); }}>Close</Button>
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
