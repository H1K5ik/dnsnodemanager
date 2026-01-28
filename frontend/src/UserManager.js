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

import ContentHeader from './ContentHeader';
import UserRow from './UserRow';
import UserDialog from './UserDialog';

import { userRoles } from "./common/userRoles";
import useAPI from './common/api';

const permissionMatrix = [
  { roles: ['ro', 'dnsop', 'dnsadmin', 'sysadmin'], actions: ['Web Login', 'View All Information'] },
  { roles: ['dnsop', 'dnsadmin', 'sysadmin'], actions: ['Manage DNS Records', 'Manage DNS Zones', 'Manage Forwarder Groups', 'Manage ACLs', 'Configuration Rollout', 'Manage DNS Views'] },
  { roles: ['dnsadmin', 'sysadmin'], actions: ['Manage Nameserver Groups', 'Manage Servers'] },
  { roles: ['sysadmin'], actions: ['Manage Local Users', 'Manage System Settings'] },
]

export default function UserManager(props) {
  const [loading, setLoading] = React.useState(true);
  const [users, setUsers] = React.useState([]);
  const [adminCount, setAdminCount] = React.useState(1);
  const [userDialogOpen, setUserDialogOpen] = React.useState(false);
  const api = useAPI();

  React.useEffect(update, []); // eslint-disable-line

  function update() {
    setLoading(true);
    api.getUsers().then( data => {
      setUsers(data);
      setAdminCount(data.filter(user => (user.role === 'sysadmin')).length);
      setLoading(false);
    } );
  }

  function add(data) {
    return api.addUser(data).then( result => {
      if( result ) {
        setUserDialogOpen(false);
        update();
      }
    } );
  }

  function isDeletable(row) {
    return (row.role !== 'sysadmin' || adminCount > 1);
  }

  return (
    <>
      <ContentHeader title="User Management">
        <Button variant="contained" color="primary" startIcon={<AddCircle />} onClick={() => { setUserDialogOpen(true); }}>Add Local User</Button>
        <UserDialog new open={userDialogOpen} roles={userRoles} onClose={() => { setUserDialogOpen(false); }} onSubmit={add} />
      </ContentHeader>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Username</TableCell>
              <TableCell>Role</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            { loading ? <></> : users.map( row => <UserRow key={row.ID} data={row} roles={userRoles} deletable={isDeletable(row)} onRefresh={update} /> ) }
          </TableBody>
        </Table>
      </TableContainer>
      { loading && ( <Box m={2}><LinearProgress /></Box> ) }
      <ContentHeader title="Role Permission Matrix" />
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>#</TableCell>
              <TableCell>Read-Only</TableCell>
              <TableCell>DNS Operator</TableCell>
              <TableCell>DNS Admin</TableCell>
              <TableCell>System Admin</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            { permissionMatrix.map( (chunk, chunkIndex) => (
              <React.Fragment key={chunkIndex}>
                { chunk.actions.map( (action, actionIndex) => (
                  <TableRow key={`${chunkIndex}-${actionIndex}`}>
                    <TableCell>{action}</TableCell>
                    <TableCell>{chunk.roles.includes('ro') ? 'YES' : 'NO'}</TableCell>
                    <TableCell>{chunk.roles.includes('dnsop') ? 'YES' : 'NO'}</TableCell>
                    <TableCell>{chunk.roles.includes('dnsadmin') ? 'YES' : 'NO'}</TableCell>
                    <TableCell>{chunk.roles.includes('sysadmin') ? 'YES' : 'NO'}</TableCell>
                  </TableRow>
                ) ) }
              </React.Fragment>
            ) ) }
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );

}
