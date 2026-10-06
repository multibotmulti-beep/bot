import { apiClient } from '../lib/api';

export const createPaymentPreference = async (
  tenantId: number,
  plan: string,
  amount: number
) => {
  const response = await apiClient('/execute', {
    method: 'POST',
    body: JSON.stringify({
      cmd: 'BILLING:create-preference',
      params: {
        plan,
        amount,
        tenantId,
      },
    }),
  });

  return response.json();
};

export const getGatewayConfig = async (
  tenantId: number,
  gatewayType: string
) => {
  const response = await apiClient('/execute', {
    method: 'POST',
    body: JSON.stringify({
      cmd: 'BILLING:get-config',
      params: {
        tenant_id: tenantId,
        gateway_type: gatewayType,
      },
    }),
  });
  return response.json();
};

export const configureGateway = async (
  tenantId: number,
  gatewayType: string,
  configData: any,
  environment: string
) => {
  const response = await apiClient('/execute', {
    method: 'POST',
    body: JSON.stringify({
      cmd: 'BILLING:config',
      params: {
        tenant_id: tenantId,
        gateway_type: gatewayType,
        config_data: configData,
        environment,
        is_active: true,
      },
    }),
  });
  return response.json();
};
