import publicActions from './public_actions'
import ActionsControllers from 'lib/actions_controllers'
import membersActions from './members_actions'

export default {
  get: ActionsControllers({
    public: {
      'by-id': publicActions.byId,
      'by-slug': publicActions.bySlug,
      'search-by-position': publicActions.searchByPositon,
      slug: publicActions.slug
    },
    authentified: {
      default: require('./get_user_groups')
    }
  }),

  post: ActionsControllers({
    authentified: {
      create: require('./create')
    }
  }),

  put: ActionsControllers({
    authentified: {
      invite: membersActions('invite'),
      accept: membersActions('accept'),
      decline: membersActions('decline'),
      request: membersActions('request'),
      'cancel-request': membersActions('cancelRequest'),
      'accept-request': membersActions('acceptRequest'),
      'refuse-request': membersActions('refuseRequest'),
      'make-admin': membersActions('makeAdmin'),
      kick: membersActions('kick'),
      leave: membersActions('leave'),
      'update-settings': require('./update_settings')
    }
  })
}
