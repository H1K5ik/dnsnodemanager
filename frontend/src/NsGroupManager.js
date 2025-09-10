import React from "react";

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
import BuildIcon from '@material-ui/icons/Build';

import ContentHeader from './ContentHeader';
import NsGroupRow from './NsGroupRow';
import NsGroupDialog from './NsGroupDialog';

import { AuthenticationContext } from "./common/AuthenticationProvider";
import useAPI from './common/api';

export default function NsGroupManager(props) {
  const [busy, setBusy] = React.useState(false);
  const [nsLoading, setNsLoading] = React.useState(true);
  const [nsGroups, setNsGroups] = React.useState([]);
  const [servers, setServers] = React.useState([]);
  const [addGroupDialog, setAddGroupDialog] = React.useState({open: false, data: {name: ''}});
  const api = useAPI();

  const session = React.useContext(AuthenticationContext);
  const canEdit = ['dnsadmin','sysadmin'].includes(session.user.role);

  React.useEffect(updateNsGroups, []);  // eslint-disable-line

  function updateNsGroups() {
    setNsLoading(true);
    api.getNsGroups().then( nsGroups => {
      setNsGroups(nsGroups);
      api.getServers().then( servers => {
        setServers(servers);
        setNsLoading(false);
      } );
    } );
  }

  function toggleDialog() {
    setAddGroupDialog( prevState => ({...prevState, open: !prevState.open}));
  }

  function handleDialogInput(event) {
    const value = event.currentTarget.value;
    setAddGroupDialog( prevState => ({...prevState, data: {name: value}}) );
  }

  function addGroup() {
    setBusy(true);
    api.addNsGroup(addGroupDialog.data).then( result => {
      if( result ) {
        setBusy(false);
        toggleDialog();
        updateNsGroups();
      }
    } );
  }

  function deleteGroup(group) {
    api.deleteNsGroup(group).then(updateNsGroups);
  }

  function autoFixPrimary() {
    setBusy(true);
    api.autoFixNsGroupPrimary().then(result => {
      if (result) {
        setBusy(false);
        updateNsGroups();
      }
    });
  }

  return (
    <>
      <ContentHeader title="Nameserver Groups">
        <Button variant="contained" color="primary" disabled={!canEdit} startIcon={<AddCircle />} onClick={toggleDialog}>Add Nameserver Group</Button>
        <Button variant="contained" color="secondary" disabled={!canEdit || busy} startIcon={<BuildIcon />} onClick={autoFixPrimary} style={{marginLeft: 10}}>Auto-Fix Primary Servers</Button>
        <NsGroupDialog new defaultName="" open={addGroupDialog.open} blocked={busy} onClose={toggleDialog} onInput={handleDialogInput} onSubmit={addGroup} />
      </ContentHeader>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell />
              <TableCell>Group Name</TableCell>
              <TableCell>Members</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            { nsLoading ? <></> : nsGroups.map( row => <NsGroupRow key={row.ID} servers={servers} data={row} readOnly={!canEdit} onDelete={deleteGroup} onUpdate={updateNsGroups} api={api} /> ) }
          </TableBody>
        </Table>
      </TableContainer>
      { nsLoading && ( <Box m={2}><LinearProgress /></Box> ) }
    </>
  );

}
