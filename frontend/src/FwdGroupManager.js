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

import ContentHeader from "./ContentHeader";
import FwdGroupRow from './FwdGroupRow';
import FwdGroupDialog from './FwdGroupDialog';

import { AuthenticationContext } from "./common/AuthenticationProvider";
import useAPI from './common/api';

export default function FwdGroupManager(props) {
  const [loading, setLoading] = React.useState(true);
  const [fwdGroups, setFwdGroups] = React.useState([]);
  const [fwdGroupDialogOpen, setFwdGroupDialogOpen] = React.useState(false);
  const api = useAPI();

  const session = React.useContext(AuthenticationContext);
  const canEdit = ['dnsop','dnsadmin','sysadmin'].includes(session.user.role);

  React.useEffect(updateFwdGroups, []);  // eslint-disable-line

  function updateFwdGroups() {
    setLoading(true);
    api.getFwdGroups().then( groups => {
      setFwdGroups(groups);
      setLoading(false);
    } );
  }

  function addFwdGroup(data) {
    return api.addFwdGroup(data).then( result => {
      if( result ) {
        setFwdGroupDialogOpen(false);
        updateFwdGroups();
      }
    } );
  }

  return (
    <>
      <ContentHeader title="Forwarder Groups">
        <Button variant="contained" color="primary" disabled={!canEdit} startIcon={<AddCircle />} onClick={() => { setFwdGroupDialogOpen(true); }}>Add Forwarder Group</Button>
        <FwdGroupDialog new open={fwdGroupDialogOpen} onClose={() => { setFwdGroupDialogOpen(false); }} onSubmit={addFwdGroup} />
      </ContentHeader>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Group Name</TableCell>
              <TableCell>Forwarders</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            { loading ? <></> : fwdGroups.map( row => <FwdGroupRow key={row.ID} data={row} readOnly={!canEdit} onRefresh={updateFwdGroups} /> ) }
          </TableBody>
        </Table>
      </TableContainer>
      { loading && ( <Box m={2}><LinearProgress /></Box> ) }
    </>
  );

}
