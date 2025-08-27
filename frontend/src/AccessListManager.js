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
import AccessListRow from './AccessListRow';
import AccessListDialog from './AccessListDialog';

import { AuthenticationContext } from "./common/AuthenticationProvider";
import useAPI from './common/api';

export default function AccessListManager(props) {
  const [loading, setLoading] = React.useState(true);
  const [acls, setAcls] = React.useState([]);
  const [aclDialogOpen, setAclDialogOpen] = React.useState(false);
  const api = useAPI();

  const session = React.useContext(AuthenticationContext);
  const canEdit = ['dnsop','dnsadmin','sysadmin'].includes(session.user.role);

  function updateAcls() {
    setLoading(true);
    api.getAcls().then( acls => {
      setAcls(acls);
      setLoading(false);
    } );
  }

  function addAcl(data) {
    return api.addAcl(data).then( result => {
      if( result ) {
        setAclDialogOpen(false);
        updateAcls();
      }
    } );
  }

  React.useEffect(updateAcls, []); // eslint-disable-line

  return (
    <>
      <ContentHeader title="Access Lists">
        <Button variant="contained" color="primary" disabled={!canEdit} startIcon={<AddCircle />} onClick={() => { setAclDialogOpen(true); }}>New ACL</Button>
        <AccessListDialog new open={aclDialogOpen} onClose={() => { setAclDialogOpen(false); }} onSubmit={addAcl} />
      </ContentHeader>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ACL Name</TableCell>
              <TableCell>IP Addresses</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            { loading ? <></> : acls.map( row => <AccessListRow key={row.ID} data={row} readOnly={!canEdit} onRefresh={updateAcls} /> ) }
          </TableBody>
        </Table>
      </TableContainer>
      { loading && ( <Box m={2}><LinearProgress /></Box> ) }
    </>
  );

}
