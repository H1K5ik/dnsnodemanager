import React from "react";
import TableRow from '@material-ui/core/TableRow';
import TableCell from '@material-ui/core/TableCell';
import IconButton from '@material-ui/core/IconButton';
import DeleteIcon from '@material-ui/icons/Delete';
import EditIcon from '@material-ui/icons/Edit';

import AccessListDialog from './AccessListDialog';
import useAPI from './common/api';

export default function AccessListRow(props) {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const api = useAPI();

  function updateAcl(data) {
    return api.updateAcl(data).then( result => {
      if( result ) {
        setDialogOpen(false);
        props.onRefresh();
      }
    } );
  }

  function deleteAcl() {
    api.deleteAcl(props.data).then(props.onRefresh);
  }

  return (
    <TableRow>
      <TableCell>{props.data.name}</TableCell>
      <TableCell style={{ whiteSpace: 'normal', wordBreak: 'break-word', maxWidth: 420 }}>{props.data.members}</TableCell>
      <TableCell component="th" scope="row">
        <IconButton aria-haspopup="true" color="primary" disabled={props.readOnly} children={<EditIcon />} onClick={() => { setDialogOpen(true); }} />
        <IconButton aria-haspopup="true" color="primary" disabled={props.readOnly} children={<DeleteIcon />} onClick={deleteAcl} />
        <AccessListDialog open={dialogOpen} data={props.data} onSubmit={updateAcl} onClose={() => { setDialogOpen(false); }} />
      </TableCell>
    </TableRow>
  );
}
