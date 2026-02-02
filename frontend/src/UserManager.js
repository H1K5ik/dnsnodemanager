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
import { useTranslation } from "./common/LanguageContext";
import useAPI from './common/api';

function getPermissionMatrix(t) {
  return [
    { roles: ['ro', 'dnsop', 'dnsadmin', 'sysadmin'], actions: [t('permissions.webLogin'), t('permissions.viewAll')] },
    { roles: ['dnsop', 'dnsadmin', 'sysadmin'], actions: [t('permissions.manageRecords'), t('permissions.manageZones'), t('permissions.manageFwdGroups'), t('permissions.manageAcls'), t('permissions.configRollout'), t('permissions.manageViews')] },
    { roles: ['dnsadmin', 'sysadmin'], actions: [t('permissions.manageNsGroups'), t('permissions.manageServers')] },
    { roles: ['sysadmin'], actions: [t('permissions.manageUsers'), t('permissions.manageSettings')] },
  ];
}

export default function UserManager(props) {
  const [loading, setLoading] = React.useState(true);
  const [users, setUsers] = React.useState([]);
  const [adminCount, setAdminCount] = React.useState(1);
  const [userDialogOpen, setUserDialogOpen] = React.useState(false);
  const { t } = useTranslation();
  const api = useAPI();
  const permissionMatrix = getPermissionMatrix(t);

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
      <ContentHeader title={t("users.title")}>
        <Button variant="contained" color="primary" startIcon={<AddCircle />} onClick={() => { setUserDialogOpen(true); }}>{t("users.addUser")}</Button>
        <UserDialog new open={userDialogOpen} roles={userRoles} onClose={() => { setUserDialogOpen(false); }} onSubmit={add} />
      </ContentHeader>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{t("users.username")}</TableCell>
              <TableCell>{t("users.role")}</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            { loading ? <></> : users.map( row => <UserRow key={row.ID} data={row} roles={userRoles} deletable={isDeletable(row)} onRefresh={update} /> ) }
          </TableBody>
        </Table>
      </TableContainer>
      { loading && ( <Box m={2}><LinearProgress /></Box> ) }
      <ContentHeader title={t("users.roleMatrix")} />
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>#</TableCell>
              <TableCell>{t("users.readOnly")}</TableCell>
              <TableCell>{t("users.dnsOperator")}</TableCell>
              <TableCell>{t("users.dnsAdmin")}</TableCell>
              <TableCell>{t("users.sysAdmin")}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            { permissionMatrix.map( (chunk, chunkIndex) => (
              <React.Fragment key={chunkIndex}>
                { chunk.actions.map( (action, actionIndex) => (
                  <TableRow key={`${chunkIndex}-${actionIndex}`}>
                    <TableCell>{action}</TableCell>
                    <TableCell>{chunk.roles.includes('ro') ? t("users.yes") : t("users.no")}</TableCell>
                    <TableCell>{chunk.roles.includes('dnsop') ? t("users.yes") : t("users.no")}</TableCell>
                    <TableCell>{chunk.roles.includes('dnsadmin') ? t("users.yes") : t("users.no")}</TableCell>
                    <TableCell>{chunk.roles.includes('sysadmin') ? t("users.yes") : t("users.no")}</TableCell>
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
