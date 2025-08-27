import React from "react";
import TableRow from '@material-ui/core/TableRow';
import TableCell from '@material-ui/core/TableCell';
import IconButton from '@material-ui/core/IconButton';
import DeleteIcon from '@material-ui/icons/Delete';
import EditIcon from '@material-ui/icons/Edit';

import UserDialog from './UserDialog';
import useAPI from './common/api';

export default function UserRow(props) {
  const [dialogOpen, setDialogOpen] = React.useState(false);
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

  return (
    <TableRow>
      <TableCell>{props.data.name}</TableCell>
      <TableCell>{props.roles[props.data.role]}</TableCell>
      <TableCell component="th" scope="row">
        <IconButton aria-haspopup="true" color="primary" children={<EditIcon />} onClick={() => { setDialogOpen(true); }} />
        <IconButton aria-haspopup="true" color="primary" disabled={!props.deletable} children={<DeleteIcon />} onClick={deleteRow} />
        <UserDialog open={dialogOpen} data={props.data} roles={props.roles} onSubmit={updateRow} onClose={() => { setDialogOpen(false); }} />
      </TableCell>
    </TableRow>
  );
}
