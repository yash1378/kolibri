import { mount, createLocalVue } from '@vue/test-utils';
import Vuex from 'vuex';
import MergeAccountDialog from '../index.vue';

import * as useRemoteFacility from '../../../../composables/useRemoteFacility';
import remoteFacilityUserData from '../../../../composables/useRemoteFacility';

const localVue = createLocalVue();
localVue.use(Vuex);
const sendMachineEvent = jest.fn();

function makeWrapper({ targetFacility, targetAccount, fullName, username } = {}) {
  const store = new Vuex.Store({
    getters: {
      session: () => {
        return { full_name: fullName };
      },
    },
  });
  return mount(MergeAccountDialog, {
    provide: {
      changeFacilityService: {
        send: sendMachineEvent,
        state: { value: 'requireAccountCreds' },
      },
      state: {
        value: {
          targetFacility,
          targetAccount,
        },
      },
    },
    mocks: {
      $store: {
        getters: {
          session: { full_name: fullName, username: username },
        },
      },
    },
    localVue,
    store,
  });
}

const getUsernameTextbox = wrapper => wrapper.find('[data-test="usernameTextbox"]');
const setUsernameTextboxValue = (wrapper, value) => {
  getUsernameTextbox(wrapper)
    .find('input')
    .setValue(value);
};
const getPasswordTextbox = wrapper => wrapper.find('[data-test="passwordTextbox"]');
const setPasswordTextboxValue = (wrapper, value) => {
  getPasswordTextbox(wrapper)
    .find('input')
    .setValue(value);
};

describe(`ChangeFacility/MergeAccountDialog`, () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it(`smoke test`, () => {
    const wrapper = makeWrapper();
    expect(wrapper.exists()).toBeTruthy();
  });

  it(`Show correct info`, () => {
    const wrapper = makeWrapper({
      targetFacility: { name: 'Test Facility' },
      fullName: 'Test User 1',
      username: 'test1',
    });
    const h2_fullname = wrapper.find('[data-test="fullName"]');
    expect(h2_fullname.text()).toEqual('Test User 1');
    const h3_username = wrapper.find('[data-test="username"]');
    expect(h3_username.text()).toEqual('test1');
    expect(wrapper.find('[data-test="usernameTextbox"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="passwordTextbox"]').exists()).toBe(true);
    expect(wrapper.text()).toContain(
      'Enter the password of the account in ‘Test Facility’ learning facility that you want to merge your account with'
    );
  });

  it('Change to useAdminPassword state when clicking link', () => {
    const wrapper = makeWrapper();
    const useAdminButton = wrapper.find('[data-test="useAdminAccount"]');
    useAdminButton.trigger('click');
    expect(sendMachineEvent).toHaveBeenCalledWith({
      type: 'USEADMIN',
    });
  });

  it('Check useAdminPassword makes username textbox appear', async () => {
    const wrapper = makeWrapper();
    wrapper.setData({ usingAdminPasswordState: true });
    await wrapper.vm.$nextTick();
    expect(wrapper.find('[data-test="usernameTextbox"]').exists()).toBe(true);
  });

  it('Check remoteFacilityUserData is called with the user credentials', async () => {
    const wrapper = makeWrapper({
      targetFacility: { id: 'id_facility', url: 'http://localhost/test' },
      fullName: 'Test User 1',
      username: 'test1',
    });
    jest.spyOn(useRemoteFacility, 'default').mockReturnValue(Promise.resolve({}));
    setPasswordTextboxValue(wrapper, 'my password');

    const continueButton = wrapper.find('[data-test="continueButton"]');
    continueButton.trigger('click');
    await wrapper.vm.$nextTick();

    expect(remoteFacilityUserData).toHaveBeenCalledWith(
      'http://localhost/test',
      'id_facility',
      'test1',
      'my password',
      null
    );
  });

  it('Check remoteFacilityUserData is called with the admin credentials', async () => {
    const wrapper = makeWrapper({
      targetFacility: { id: 'id_facility', url: 'http://localhost/test' },
      fullName: 'Test User 1',
      username: 'test1',
    });
    jest.spyOn(useRemoteFacility, 'default').mockReturnValue(Promise.resolve({}));
    wrapper.setData({ usingAdminPasswordState: true });
    await wrapper.vm.$nextTick();

    setUsernameTextboxValue(wrapper, 'testadmin');
    setPasswordTextboxValue(wrapper, 'admin password');

    const continueButton = wrapper.find('[data-test="continueButton"]');
    continueButton.trigger('click');
    await wrapper.vm.$nextTick();
    expect(remoteFacilityUserData).toHaveBeenCalledWith(
      'http://localhost/test',
      'id_facility',
      'test1',
      'admin password',
      'testadmin'
    );
  });
});
