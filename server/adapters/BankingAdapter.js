// server/adapters/BankingAdapter.js
// iCamagu — Abstract Banking Adapter
// Defines the contract all bank adapters must implement.
// Manual EFT only until bank agreements are in place.
// Culture before capital. 🌾

export class BankingAdapter {
  constructor(config) {
      this.config = config;
        }

          // Create a sub-account for a member within a stokvel
            async createSubAccount(memberId, stokvelId) {
                throw new Error('createSubAccount() must be implemented by subclass');
                  }

                    // Get balance for a sub-account
                      async getBalance(subAccountRef) {
                          throw new Error('getBalance() must be implemented by subclass');
                            }

                              // Record a contribution (credit) to a sub-account
                                async recordContribution(subAccountRef, amount, ref) {
                                    throw new Error('recordContribution() must be implemented by subclass');
                                      }

                                        // Initiate a payout (debit) from a sub-account
                                          async initiatePayout(subAccountRef, amount, destination) {
                                              throw new Error('initiatePayout() must be implemented by subclass');
                                                }

                                                  // Reconcile stokvel transactions
                                                    async reconcile(stokvelId) {
                                                        throw new Error('reconcile() must be implemented by subclass');
                                                          }

                                                            // Ingest raw webhook payload
                                                              async ingestWebhook(payload) {
                                                                  throw new Error('ingestWebhook() must be implemented by subclass');
                                                                    }
                                                                    }
                                                                    
