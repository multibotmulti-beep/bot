export * from './types';
export * from './registry';

// Importar acciones para asegurar el autorregistro en el CapabilityRegistry
import './actions/listMyBots.capability';
import './actions/listAllBots.capability';
import './actions/authLogin.capability';
import './actions/manageBot.capability';
import './actions/listChats.capability';
