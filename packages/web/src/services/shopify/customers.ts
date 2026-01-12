import { ShopifyAPIError } from '@booth-buddy/shared';
import { ShopifyClientBase } from './base';

/**
 * Customer operations for ShopifyClient
 */
export class CustomerOperations extends ShopifyClientBase {
  /**
   * Get customer by ID
   */
  async getCustomer(customerId: string) {
    try {
      const query = `
        query getCustomer($id: ID!) {
          customer(id: $id) {
            id
            email
            firstName
            lastName
            tags
            state
            createdAt
            updatedAt
          }
        }
      `;

      const data = await this.executeGraphQL<{
        customer: {
          id: string;
          email: string;
          firstName: string | null;
          lastName: string | null;
          tags: string[];
          state: string;
          createdAt: string;
          updatedAt: string;
        } | null;
      }>(query, { id: this.toGlobalId('Customer', customerId) });

      if (!data.customer) {
        throw new ShopifyAPIError('Customer not found');
      }

      return {
        id: this.extractId(data.customer.id),
        email: data.customer.email,
        first_name: data.customer.firstName,
        last_name: data.customer.lastName,
        tags: data.customer.tags.join(', '),
        state: data.customer.state.toLowerCase(),
        created_at: data.customer.createdAt,
        updated_at: data.customer.updatedAt,
      };
    } catch (error) {
      throw this.handleError(error, 'Failed to get customer');
    }
  }

  /**
   * Update customer tags
   */
  async updateCustomerTags(customerId: string, tags: string[]) {
    try {
      const mutation = `
        mutation customerUpdate($input: CustomerInput!) {
          customerUpdate(input: $input) {
            customer {
              id
              email
              firstName
              lastName
              tags
            }
            userErrors {
              field
              message
            }
          }
        }
      `;

      const data = await this.executeGraphQL<{
        customerUpdate: {
          customer: {
            id: string;
            email: string;
            firstName: string | null;
            lastName: string | null;
            tags: string[];
          } | null;
          userErrors: Array<{ field: string[]; message: string }>;
        };
      }>(mutation, {
        input: {
          id: this.toGlobalId('Customer', customerId),
          tags,
        },
      });

      if (data.customerUpdate.userErrors.length > 0) {
        const errorMsg = data.customerUpdate.userErrors.map(e => e.message).join(', ');
        throw new ShopifyAPIError(`Failed to update customer: ${errorMsg}`);
      }

      const customer = data.customerUpdate.customer;
      if (!customer) {
        throw new ShopifyAPIError('Customer not found');
      }

      return {
        id: this.extractId(customer.id),
        email: customer.email,
        first_name: customer.firstName,
        last_name: customer.lastName,
        tags: customer.tags.join(', '),
      };
    } catch (error) {
      throw this.handleError(error, 'Failed to update customer tags');
    }
  }

  /**
   * Search for customer by email
   */
  async findCustomerByEmail(email: string) {
    try {
      const query = `
        query findCustomerByEmail($query: String!) {
          customers(first: 1, query: $query) {
            edges {
              node {
                id
                email
                firstName
                lastName
                tags
                state
                createdAt
                updatedAt
              }
            }
          }
        }
      `;

      const data = await this.executeGraphQL<{
        customers: {
          edges: Array<{
            node: {
              id: string;
              email: string;
              firstName: string | null;
              lastName: string | null;
              tags: string[];
              state: string;
              createdAt: string;
              updatedAt: string;
            };
          }>;
        };
      }>(query, { query: `email:${email}` });

      if (data.customers.edges.length === 0) {
        return null;
      }

      const customer = data.customers.edges[0].node;

      return {
        id: this.extractId(customer.id),
        email: customer.email,
        first_name: customer.firstName,
        last_name: customer.lastName,
        tags: customer.tags.join(', '),
        state: customer.state.toLowerCase(),
        created_at: customer.createdAt,
        updated_at: customer.updatedAt,
      };
    } catch (error) {
      throw this.handleError(error, 'Failed to search for customer');
    }
  }

  /**
   * Create a new customer
   */
  async createCustomer(email: string, firstName?: string, lastName?: string) {
    try {
      const mutation = `
        mutation customerCreate($input: CustomerInput!) {
          customerCreate(input: $input) {
            customer {
              id
              email
              firstName
              lastName
              tags
              state
              createdAt
            }
            userErrors {
              field
              message
            }
          }
        }
      `;

      const data = await this.executeGraphQL<{
        customerCreate: {
          customer: {
            id: string;
            email: string;
            firstName: string | null;
            lastName: string | null;
            tags: string[];
            state: string;
            createdAt: string;
          } | null;
          userErrors: Array<{ field: string[]; message: string }>;
        };
      }>(mutation, {
        input: {
          email,
          firstName: firstName || null,
          lastName: lastName || null,
          emailMarketingConsent: {
            marketingState: 'NOT_SUBSCRIBED',
            marketingOptInLevel: 'SINGLE_OPT_IN',
          },
        },
      });

      if (data.customerCreate.userErrors.length > 0) {
        const errorMsg = data.customerCreate.userErrors.map(e => e.message).join(', ');
        throw new ShopifyAPIError(`Failed to create customer: ${errorMsg}`);
      }

      const customer = data.customerCreate.customer;
      if (!customer) {
        throw new ShopifyAPIError('Customer creation failed');
      }

      return {
        id: this.extractId(customer.id),
        email: customer.email,
        first_name: customer.firstName,
        last_name: customer.lastName,
        tags: customer.tags.join(', '),
        state: customer.state.toLowerCase(),
        created_at: customer.createdAt,
      };
    } catch (error) {
      throw this.handleError(error, 'Failed to create customer');
    }
  }

  /**
   * Send account activation email to customer
   */
  async sendAccountInvite(customerId: string) {
    try {
      const mutation = `
        mutation customerSendAccountInviteEmail($customerId: ID!) {
          customerSendAccountInviteEmail(customerId: $customerId) {
            customer {
              id
              email
            }
            userErrors {
              field
              message
            }
          }
        }
      `;

      const data = await this.executeGraphQL<{
        customerSendAccountInviteEmail: {
          customer: {
            id: string;
            email: string;
          } | null;
          userErrors: Array<{ field: string[]; message: string }>;
        };
      }>(mutation, {
        customerId: this.toGlobalId('Customer', customerId),
      });

      if (data.customerSendAccountInviteEmail.userErrors.length > 0) {
        const errorMsg = data.customerSendAccountInviteEmail.userErrors.map(e => e.message).join(', ');
        throw new ShopifyAPIError(`Failed to send account invite: ${errorMsg}`);
      }

      return {
        sent: true,
        customer_id: customerId,
      };
    } catch (error) {
      throw this.handleError(error, 'Failed to send account invite');
    }
  }
}
