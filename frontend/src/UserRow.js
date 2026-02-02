import React from "react";
import { useTranslation } from './common/LanguageContext';
import TableRow from '@material-ui/core/TableRow';
import TableCell from '@material-ui/core/TableCell';
import IconButton from '@material-ui/core/IconButton';
import DeleteIcon from '@material-ui/icons/Delete';
import EditIcon from '@material-ui/icons/Edit';
import GroupWorkIcon from '@material-ui/icons/GroupWork';
import Tooltip from '@material-ui/core/Tooltip';

import UserDialog from './UserDialog';
import UserNsGroupAccessDialog from './UserNsGroupAccessDialog';
import useAPI from './common/api';

export default function UserRow(props) {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [accessDialogOpen, setAccessDialogOpen] = React.useState(false);
  const { t } = useTranslation();
  const api = useAPI();

  function updateRow(data) {
    return api.updateUser(data).then( result => {
      if( result ) {
        setDialogOpen(false);
        props.onRefresh();
      }
      return result;
    } );
  }

  function deleteRow() {
    api.deleteUser(props.data).then(props.onRefresh);
  }

  const isDnsOperator = props.data.role === 'dnsop';

  return (
    <TableRow>
      <TableCell>{props.data.name}</TableCell>
      <TableCell>{t('roles.' + props.data.role)}</TableCell>
      <TableCell component="th" scope="row">
        <Tooltip title={t('users.editUser')}>
          <IconButton aria-haspopup="true" color="primary" children={<EditIcon />} onClick={() => { setDialogOpen(true); }} />
        </Tooltip>
        {isDnsOperator && (
          <Tooltip title={t('users.manageNsAccess')}>
            <IconButton aria-haspopup="true" color="primary" children={<GroupWorkIcon />} onClick={() => { setAccessDialogOpen(true); }} />
          </Tooltip>
        )}
        <Tooltip title={t('users.deleteUser')}>
          <span>
            <IconButton aria-haspopup="true" color="primary" disabled={!props.deletable} children={<DeleteIcon />} onClick={deleteRow} />
          </span>
        </Tooltip>
        <UserDialog open={dialogOpen} data={props.data} roles={props.roles} onSubmit={updateRow} onClose={() => { setDialogOpen(false); }} />
        {isDnsOperator && (
          <UserNsGroupAccessDialog 
            open={accessDialogOpen} 
            userId={props.data.ID}
            onClose={() => { setAccessDialogOpen(false); }}
            onRefresh={props.onRefresh}
          />
        )}
      </TableCell>
    </TableRow>
  );
}
