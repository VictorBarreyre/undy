import React from 'react';
import { Modal, View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faAddressBook, faCog } from '@fortawesome/free-solid-svg-icons';

const ContactsPermissionModal = ({ 
  visible, 
  onClose, 
  onOpenSettings, 
  onRequestPermission 
}) => {
  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <FontAwesomeIcon 
            icon={faAddressBook} 
            size={64} 
            color="#FF78B2" 
            style={styles.icon}
          />
          
          <Text style={styles.modalTitle}>
            {Platform.OS === 'ios' 
              ? "Autoriser l'accès aux contacts" 
              : "Permission de lecture des contacts"}
          </Text>
          
          <Text style={styles.modalText}>
            Cette fonctionnalité nécessite l'accès à vos contacts pour vous aider à vous connecter avec vos amis.
          </Text>
          
          <View style={styles.buttonContainer}>
            <Pressable 
              style={[styles.button, styles.buttonCancel]} 
              onPress={onClose}
            >
              <Text style={styles.buttonTextCancel}>Annuler</Text>
            </Pressable>
            
            <Pressable 
              style={[styles.button, styles.buttonSettings]} 
              onPress={Platform.OS === 'ios' ? onOpenSettings : onRequestPermission}
            >
              <FontAwesomeIcon 
                icon={faCog} 
                size={20} 
                color="white" 
                style={styles.buttonIcon}
              />
              <Text style={styles.buttonTextSettings}>
                {Platform.OS === 'ios' ? "Paramètres" : "Autoriser"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)'
  },
  modalView: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5
  },
  icon: {
    marginBottom: 20
  },
  modalTitle: {
    marginBottom: 15,
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 18
  },
  modalText: {
    marginBottom: 20,
    textAlign: 'center',
    color: '#666'
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%'
  },
  button: {
    borderRadius: 10,
    padding: 10,
    elevation: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '45%'
  },
  buttonCancel: {
    backgroundColor: '#F0F0F0'
  },
  buttonSettings: {
    backgroundColor: '#FF78B2'
  },
  buttonTextCancel: {
    color: 'black',
    fontWeight: 'bold',
    textAlign: 'center'
  },
  buttonTextSettings: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
    marginLeft: 10
  },
  buttonIcon: {
    marginRight: 5
  }
});

export default ContactsPermissionModal;